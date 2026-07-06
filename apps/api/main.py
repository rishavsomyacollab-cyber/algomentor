import json
import os
import threading
import httpx

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

import database
import claude_service
import crawler as crawler_module
import pipeline as pipeline_module
from agents import tutor_agent, quiz_agent, visualization_agent
from vector_store import get_store
from graph_store import get_graph
from recommendation_engine import get_recommendations, get_similar_topics
from auth import router as auth_router, get_current_user, get_optional_user

app = FastAPI(title="AlgoMentor API")
app.include_router(auth_router, prefix="/api")

_default_origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"]
_extra = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = _default_origins + [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


def _prewarm():
    claude_service.prewarm_all()
    _index_vectors()


def _fill_quiz_bank():
    """Fill quiz bank for every topic × difficulty in a background daemon thread."""
    try:
        topics = database.get_all_topics()
        print(f"[quiz_bank] starting background fill for {len(topics)} topics…")
        claude_service.fill_quiz_bank_all(topics)
    except Exception as e:
        print(f"[quiz_bank] background fill error: {e}")


def _index_vectors():
    """Index all topics into ChromaDB and pre-warm explanation chunks."""
    try:
        store = get_store()
        topics = database.get_all_topics()
        store.index_topics(topics)
        print(f"[vector] indexed {len(topics)} topics")
        # Index any explanations already in ai_cache
        for t in topics:
            cached = database.cache_get(f"explain:{t['id']}")
            if cached:
                store.index_explanation(t["id"], t["name"], cached)
    except Exception as e:
        print(f"[vector] startup indexing error: {e}")


@app.on_event("startup")
def startup():
    database.init_db()
    threading.Thread(target=_prewarm, daemon=True).start()  # _index_vectors runs at end of _prewarm
    threading.Thread(target=_init_graph, daemon=True).start()


def _init_graph():
    try:
        graph = get_graph()
        if graph.available:
            topics = database.get_all_topics()
            graph.init_graph(topics)
    except Exception as e:
        print(f"[graph] startup init error: {e}")


# ── Request models ────────────────────────────────────────────────────────────

class AnimateRequest(BaseModel):
    topic_id: str
    topic_name: str
    input_array: Optional[List[float]] = None
    target: Optional[float] = None

class ExplainRequest(BaseModel):
    topic_id: str
    topic_name: str

class QuizGenerateRequest(BaseModel):
    topic_id: str
    topic_name: str
    difficulty: str = "medium"
    count: int = 5
    variant: int = 0

class EvaluateRequest(BaseModel):
    topic_name: str
    question: str
    options: List[str]
    correct_index: int
    user_index: int

class HintRequest(BaseModel):
    topic_name: str
    question: str
    options: List[str]
    hint_level: int = 1

class ProgressRequest(BaseModel):
    topic_id: str
    completed: bool = False
    quiz_score: Optional[int] = None

class ChatRequest(BaseModel):
    message: str
    topic_name: Optional[str] = None

class CreateTopicRequest(BaseModel):
    name: str
    category: str = "user_added"
    difficulty: str = "intermediate"


# ── Health check ─────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


# ── REST routes ───────────────────────────────────────────────────────────────

@app.get("/api/topics")
def list_topics(current_user: Optional[dict] = Depends(get_optional_user)):
    uid = current_user["id"] if current_user else None
    return database.get_all_topics(user_id=uid)


@app.get("/api/progress")
def get_progress(current_user: Optional[dict] = Depends(get_optional_user)):
    if current_user:
        return database.get_user_progress(current_user["id"])
    return database.get_progress()


@app.post("/api/explain")
def explain(req: ExplainRequest):
    result = tutor_agent.run(req.topic_id, req.topic_name)
    if result and result.get("concept"):
        # Index explanation chunks in background so future RAG queries benefit
        threading.Thread(
            target=get_store().index_explanation,
            args=(req.topic_id, req.topic_name, result),
            daemon=True,
        ).start()
    return result or {}


@app.post("/api/animate")
def animate(req: AnimateRequest):
    result = visualization_agent.get_animation(req.topic_id, req.topic_name, req.input_array, req.target)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get animation")
    return result


@app.get("/api/pseudocode/{topic_id}")
def pseudocode(topic_id: str):
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    # Serve from permanent topic_content if available
    tc = database.get_topic_content(topic_id)
    if tc and (tc.get("pseudocode") or tc.get("code_python")):
        return {
            "algorithm":  topic["name"],
            "pseudocode": tc.get("pseudocode", ""),
            "python":     tc.get("code_python", ""),
            "java":       tc.get("code_java", ""),
        }
    # Fall back to on-demand generation
    result = tutor_agent.get_pseudocode(topic_id, topic["name"])
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get pseudocode")
    return result


@app.get("/api/complexity/{topic_id}")
def complexity(topic_id: str):
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    # Serve from permanent topic_content if available
    tc = database.get_topic_content(topic_id)
    if tc and tc.get("complexity_json"):
        cj = tc["complexity_json"]
        return {
            "algorithm":       topic["name"],
            "time_complexity": cj.get("time", {}),
            "space_complexity": cj.get("space", {}),
            "practical_notes": cj.get("notes", ""),
        }
    # Fall back to on-demand generation
    result = tutor_agent.analyze_complexity(topic_id, topic["name"])
    if not result:
        raise HTTPException(status_code=500, detail="Failed to analyze complexity")
    return result


@app.post("/api/quiz/generate")
def generate_quiz(req: QuizGenerateRequest):
    # 1. Fast path — already in bank
    questions = database.get_random_quiz_questions(req.topic_id, req.difficulty, req.count)
    if len(questions) >= req.count:
        return {"questions": questions}

    # 2. Cold start — generate one batch synchronously for this topic so the user
    #    isn't stuck forever. After the first load it's always instant from the DB.
    print(f"[quiz] cold-start fill for {req.topic_id}/{req.difficulty}")
    claude_service.build_quiz_bank(req.topic_id, req.topic_name, req.difficulty)
    questions = database.get_random_quiz_questions(req.topic_id, req.difficulty, req.count)
    if len(questions) >= req.count:
        return {"questions": questions}

    # 3. LLM failed (shouldn't happen often) — tell client to retry
    return {"preparing": True}


@app.get("/api/admin/quiz-bank/status")
def quiz_bank_status():
    """Shows how many questions are banked per topic/difficulty."""
    topics = database.get_all_topics()
    result = []
    total = 0
    for t in topics:
        row = {"id": t["id"], "name": t["name"]}
        for diff in ("easy", "medium", "hard"):
            cnt = database.get_quiz_bank_count(t["id"], diff)
            row[diff] = cnt
            total += cnt
        row["ready"] = all(row[d] >= 5 for d in ("easy", "medium", "hard"))
        result.append(row)
    ready = sum(1 for r in result if r["ready"])
    return {"total_questions": total, "topics_ready": ready, "topics_total": len(result), "topics": result}


@app.post("/api/admin/quiz-bank/fill")
def trigger_quiz_bank_fill():
    """Manually trigger quiz bank generation (idempotent — skips topics already at target)."""
    threading.Thread(target=_fill_quiz_bank, daemon=True).start()
    return {"status": "started", "message": "Quiz bank fill running in background"}


@app.post("/api/quiz/evaluate")
def evaluate_answer(req: EvaluateRequest):
    result = quiz_agent.evaluate(req.topic_name, req.question, req.options, req.correct_index, req.user_index)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to evaluate answer")
    return result


@app.post("/api/quiz/hint")
def get_hint(req: HintRequest):
    result = quiz_agent.hint(req.topic_name, req.question, req.options, req.hint_level)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get hint")
    return result


@app.post("/api/progress")
def update_progress(req: ProgressRequest,
                    current_user: Optional[dict] = Depends(get_optional_user)):
    if current_user:
        database.save_user_progress(current_user["id"], req.topic_id,
                                    req.completed, req.quiz_score)
    else:
        database.save_progress(req.topic_id, req.completed, req.quiz_score)
    return {"status": "saved"}


class ActivityRequest(BaseModel):
    topic_id: Optional[str] = None
    event_type: str
    event_data: Optional[str] = None


@app.post("/api/activity")
def log_activity(req: ActivityRequest,
                 current_user: dict = Depends(get_current_user)):
    database.log_activity(current_user["id"], req.event_type, req.topic_id, req.event_data)
    return {"status": "ok"}


@app.get("/api/bookmarks")
def get_bookmarks(current_user: dict = Depends(get_current_user)):
    return database.get_bookmarks(current_user["id"])


@app.post("/api/bookmarks/{topic_id}")
def toggle_bookmark(topic_id: str, current_user: dict = Depends(get_current_user)):
    bookmarked = database.toggle_bookmark(current_user["id"], topic_id)
    return {"bookmarked": bookmarked}


@app.post("/api/chat")
def chat(req: ChatRequest):
    result = claude_service.chat_message(req.message, req.topic_name)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get response")
    return result


# ── Dynamic topic creation ────────────────────────────────────────────────────

@app.post("/api/topics/create")
def create_topic(req: CreateTopicRequest):
    """Create a new topic on-the-fly (if it doesn't already exist) and index it."""
    import re
    topic_id = re.sub(r"[^a-z0-9]+", "_", req.name.lower()).strip("_")
    category = req.category if req.category != "user_added" else _infer_category(req.name)
    difficulty = req.difficulty if req.difficulty != "intermediate" else _infer_difficulty(req.name)
    topic = database.create_or_get_topic(topic_id, req.name, category, difficulty=difficulty)
    threading.Thread(target=get_store().index_topics, args=([topic],), daemon=True).start()
    return topic


def _infer_category(name: str) -> str:
    n = name.lower()
    if any(w in n for w in ["sort", "sorting"]): return "sorting"
    if any(w in n for w in ["search", "binary search"]): return "searching"
    if any(w in n for w in ["graph", "bfs", "dfs", "topolog", "dijkstra", "bellman",
                             "shortest path", "spanning", "flow", "scc", "tarjan"]): return "graphs"
    if any(w in n for w in ["dp", "dynamic", "knapsack", "fibonacci", "lcs", "lis",
                             "memoiz", "tabul", "subproblem"]): return "dynamic_programming"
    if any(w in n for w in ["tree", "trie", "heap", "segment", "fenwick", "avl", "red-black",
                             "b-tree", "binary tree", "bst"]): return "data_structures"
    if any(w in n for w in ["array", "string", "pointer", "window", "subarray",
                             "two pointer", "sliding"]): return "arrays"
    if any(w in n for w in ["list", "stack", "queue", "hash", "map", "set",
                             "deque", "linked"]): return "data_structures"
    return "data_structures"


def _infer_difficulty(name: str) -> str:
    n = name.lower()
    advanced = ["dijkstra", "bellman", "floyd", "segment tree", "fenwick", "suffix",
                "kmp", "aho", "convex hull", "tarjan", "kosaraju", "scc", "network flow",
                "persistent", "treap", "splay", "heavy light"]
    beginner = ["array", "stack", "queue", "linked list", "binary search",
                "bubble sort", "insertion sort", "selection sort", "string"]
    if any(w in n for w in advanced): return "advanced"
    if any(w in n for w in beginner): return "beginner"
    return "intermediate"


# ── Vector search & recommendations ──────────────────────────────────────────

@app.get("/api/search/quick")
def quick_search(q: str = Query(..., min_length=1), n: int = Query(6, ge=1, le=20)):
    """Fast SQL LIKE search — no embeddings, sub-50ms. Used for the live search bar."""
    hits = database.search_topics_by_name(q, limit=n)
    return [{"id": t["id"], "name": t["name"], "category": t["category"],
             "difficulty": t["difficulty"], "description": t["description"],
             "score": 100.0, "match_type": "exact"} for t in hits]


@app.get("/api/search")
def semantic_search(q: str = Query(..., min_length=1), n: int = Query(4, ge=1, le=10)):
    """Hybrid search: SQL name match + semantic vector search, merged and deduplicated."""
    sql_hits = database.search_topics_by_name(q, limit=n)
    sql_ids = {t["id"] for t in sql_hits}
    vec_hits = get_store().search_topics(q, n_results=n)

    seen = set(sql_ids)
    merged = [{"id": t["id"], "name": t["name"], "category": t["category"],
               "difficulty": t["difficulty"], "description": t["description"],
               "score": 100.0, "match_type": "exact"} for t in sql_hits]
    for r in vec_hits:
        if r["id"] not in seen:
            r["match_type"] = "semantic"
            merged.append(r)
            seen.add(r["id"])
    return merged[:n]


@app.get("/api/recommend/{topic_id}")
def recommend(topic_id: str, n: int = Query(6, ge=1, le=12)):
    """
    Per-topic recommendations: Qdrant vector similarity + graph neighbors.
    No auth required — works without a logged-in user.
    """
    return get_similar_topics(topic_id, limit=n)


@app.get("/api/recommendations")
def personalised_feed(
    limit: int = Query(8, ge=1, le=20),
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """
    Personalised 'What to learn next' feed.
    Authenticated: full hybrid scoring (Neo4j + Qdrant + activity signals).
    Anonymous: cold-start beginner list.
    """
    if current_user:
        return get_recommendations(current_user["id"], limit=limit)
    # Anonymous cold-start
    from recommendation_engine import _cold_start, _topic_map
    all_topics = {t["id"]: t for t in database.get_all_topics() if t.get("depth", 1) > 0}
    return _cold_start(all_topics, limit)


# ── Streaming SSE endpoint ────────────────────────────────────────────────────

@app.get("/api/stream/explain")
def stream_explain(topic_id: str, topic_name: str):
    """Server-Sent Events endpoint: streams explanation tokens from the Tutor Agent."""

    def generate():
        try:
            for chunk in tutor_agent.stream(topic_id, topic_name):
                if chunk:
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Agent introspection ───────────────────────────────────────────────────────

@app.get("/api/agents")
def list_agents():
    """Returns metadata about all registered agents."""
    return [
        {"name": tutor_agent.name,         "description": tutor_agent.description},
        {"name": quiz_agent.name,           "description": quiz_agent.description},
        {"name": visualization_agent.name,  "description": visualization_agent.description},
    ]


# ── Admin endpoints ───────────────────────────────────────────────────────────

@app.post("/api/admin/crawl/{topic_id}")
def admin_crawl_topic(topic_id: str):
    """Crawl a single topic from GFG and store raw content."""
    import asyncio
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    text = asyncio.run(crawler_module.crawl_topic(topic_id, topic["name"]))
    if not text:
        raise HTTPException(status_code=500, detail="Crawl failed or returned no content")
    return {"topic_id": topic_id, "chars": len(text)}


@app.post("/api/admin/crawl/all")
def admin_crawl_all():
    """Crawl all topics that haven't been crawled yet. Runs in background."""
    threading.Thread(target=crawler_module.crawl_all_sync, daemon=True).start()
    return {"status": "started"}


@app.post("/api/admin/generate/{topic_id}")
def admin_generate_topic(topic_id: str, force: bool = False):
    """Generate content for a single topic (crawl first if needed)."""
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    result = pipeline_module.generate_from_name(topic_id, topic["name"], force=force)
    if not result:
        raise HTTPException(status_code=500, detail="Generation failed")
    return {"topic_id": topic_id, "status": "generated"}


@app.post("/api/admin/generate/all")
def admin_generate_all(force: bool = False):
    """Generate content for all crawled topics. Runs in background."""
    threading.Thread(target=pipeline_module.generate_all, kwargs={"force": force}, daemon=True).start()
    return {"status": "started", "force": force}


@app.get("/api/admin/status")
def admin_status():
    """Return crawl and generation status for all topics."""
    topics = database.get_all_topics()
    crawl_status = database.get_crawl_status()
    crawled_ids = {r["topic_id"] for r in crawl_status}
    generated = database.list_generated_topics()
    generated_ids = {r["topic_id"] for r in generated}

    rows = []
    for t in topics:
        if t.get("depth", 1) == 0:
            continue
        rows.append({
            "id":        t["id"],
            "name":      t["name"],
            "crawled":   t["id"] in crawled_ids,
            "generated": t["id"] in generated_ids,
        })

    total   = len(rows)
    crawled = sum(1 for r in rows if r["crawled"])
    genned  = sum(1 for r in rows if r["generated"])
    return {
        "total":     total,
        "crawled":   crawled,
        "generated": genned,
        "topics":    rows,
    }


# ── Graph endpoints ───────────────────────────────────────────────────────────

@app.get("/api/graph/topic/{topic_id}")
def graph_neighborhood(topic_id: str):
    """
    Returns the immediate graph neighborhood of a topic.
    Falls back to static EDGES when Neo4j is not available.
    """
    from graph_store import EDGES
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    graph = get_graph()
    if graph.available:
        return graph.get_topic_neighborhood(topic_id)

    # Static fallback: derive neighborhood from the EDGES constant
    all_topics = {t["id"]: t for t in database.get_all_topics()}
    def _t(tid): return all_topics.get(tid, {"id": tid, "name": tid, "difficulty": "", "category": ""})

    prereqs = [_t(s) for s, d, r in EDGES if d == topic_id and r == "PREREQUISITE"]
    nxt     = [_t(d) for s, d, r in EDGES if s == topic_id and r == "PREREQUISITE"]
    related = list({
        d for s, d, r in EDGES if s == topic_id and r == "RELATED"
    } | {
        s for s, d, r in EDGES if d == topic_id and r == "RELATED"
    })
    return {"prerequisites": prereqs, "next": nxt, "related": [_t(tid) for tid in related]}


@app.get("/api/graph/path")
def learning_path(
    from_id: str = Query(..., description="Starting topic id"),
    to_id:   str = Query(..., description="Destination topic id"),
):
    """Shortest PREREQUISITE path between two topics."""
    path = get_graph().get_learning_path(from_id, to_id)
    if not path:
        raise HTTPException(status_code=404, detail="No prerequisite path found")
    return {"path": path}


@app.get("/api/graph/category/{category}")
def category_subgraph(category: str):
    """
    All nodes + PREREQUISITE/RELATED edges within a category.
    Falls back to static EDGES when Neo4j is offline.
    """
    from graph_store import EDGES
    topics = [t for t in database.get_all_topics()
              if t.get("category") == category and t.get("depth", 1) > 0]
    topic_ids = {t["id"] for t in topics}

    graph = get_graph()
    if graph.available:
        edges = graph.get_category_subgraph(category)
    else:
        edges = [
            {"source": s, "target": d, "rel_type": r}
            for s, d, r in EDGES
            if s in topic_ids and d in topic_ids
        ]
    return {"nodes": topics, "edges": edges}


@app.get("/api/graph/recommend")
def graph_recommend(current_user: dict = Depends(get_current_user)):
    """
    'What should I learn next?' based on the user's completed topics.
    Requires auth. Falls back to [] when Neo4j is offline.
    """
    progress = database.get_user_progress(current_user["id"])
    completed_ids = [p["topic_id"] for p in progress if p.get("completed")]
    return get_graph().get_recommendations_for_user(completed_ids, limit=5)


@app.get("/api/graph/status")
def graph_status():
    """Returns whether Neo4j is connected."""
    return {"available": get_graph().available}


# ── Dashboard endpoints ───────────────────────────────────────────────────────

@app.get("/api/user/stats")
def user_stats(current_user: dict = Depends(get_current_user)):
    """Aggregated stats for the dashboard: progress, heatmap, streak, categories."""
    return database.get_user_stats(current_user["id"])


@app.get("/api/user/activity")
def user_activity_feed(
    limit: int = Query(30, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Recent activity feed enriched with topic names."""
    return database.get_user_activity_feed(current_user["id"], limit=limit)


# ── User preferences / onboarding ─────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    message: str
    rating: Optional[int] = None        # 1–5
    category: Optional[str] = None      # "bug" | "suggestion" | "content" | "other"
    name: Optional[str] = None
    email: Optional[str] = None
    topic_id: Optional[str] = None


@app.post("/api/feedback", status_code=201)
def submit_feedback(req: FeedbackRequest,
                    current_user: Optional[dict] = Depends(get_optional_user)):
    user_id = current_user["id"] if current_user else None
    feedback_id = database.save_feedback(
        message=req.message,
        rating=req.rating,
        category=req.category,
        name=req.name,
        email=req.email,
        topic_id=req.topic_id,
        user_id=user_id,
    )
    return {"status": "saved", "id": feedback_id}


@app.get("/api/admin/feedback")
def get_feedback(limit: int = Query(100, ge=1, le=500),
                 offset: int = Query(0, ge=0)):
    return database.get_all_feedback(limit=limit, offset=offset)


class PreferencesRequest(BaseModel):
    experience_level: str
    goal: str
    interested_categories: List[str]
    weekly_hours: str


@app.post("/api/user/preferences")
def save_preferences(req: PreferencesRequest, current_user: dict = Depends(get_current_user)):
    database.save_user_preferences(
        current_user["id"], req.experience_level, req.goal,
        req.interested_categories, req.weekly_hours,
    )
    return {"status": "saved"}


@app.get("/api/user/preferences")
def get_preferences(current_user: dict = Depends(get_current_user)):
    prefs = database.get_user_preferences(current_user["id"])
    return prefs or {"onboarding_completed": False}


# ── Graph endpoints ───────────────────────────────────────────────────────────

@app.get("/api/graph/edges")
def all_graph_edges():
    """
    Returns the full static PREREQUISITE/RELATED edge list.
    Always works — no Neo4j dependency. Used by the frontend graph visualisation
    when Neo4j is offline.
    """
    from graph_store import EDGES
    return [{"source": s, "target": t, "rel_type": r} for s, t, r in EDGES]
