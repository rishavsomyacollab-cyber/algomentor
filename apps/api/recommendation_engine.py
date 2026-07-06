"""
Hybrid Recommendation Engine — Phase 9.

Merges four independent signals into a ranked list of topics to study next:

  Signal                  Weight   Source
  ──────────────────────  ──────   ──────────────────────────────────────────
  graph_next              40 pts   Neo4j: PREREQUISITE edge from a completed topic
  bookmark_neighbor       25 pts   Neo4j: next/related to a bookmarked topic
  vector_similar          30 pts   Qdrant: cosine-similar to recently viewed topics
  graph_related           20 pts   Neo4j: RELATED edge to a recently viewed topic
  category_affinity       15 pts   User's strongest category (by avg quiz score)
  difficulty_progression  10 pts   Natural step-up in difficulty

Completed topics are always excluded from the output.
Cold-start (< 3 data points): returns beginner topics ordered by difficulty tier.
"""

from __future__ import annotations
import database
from graph_store import get_graph
from vector_store import get_store

# difficulty ordering for progression bonus
_DIFF_ORDER = {"beginner": 0, "intermediate": 1, "advanced": 2}


def _next_difficulty(completed_topics: list[dict]) -> str | None:
    """Return the difficulty level one step up from the user's average."""
    if not completed_topics:
        return "beginner"
    levels = [_DIFF_ORDER.get(t.get("difficulty", ""), 1) for t in completed_topics]
    avg = sum(levels) / len(levels)
    if avg < 0.4:
        return "intermediate"
    if avg < 1.4:
        return "advanced"
    return None  # already at advanced — no further step


def _topic_map(user_id: str) -> dict[str, dict]:
    """Return {topic_id: topic_row} for all topics, enriched with user progress."""
    all_topics = {t["id"]: t for t in database.get_all_topics() if t.get("depth", 1) > 0}
    return all_topics


def get_recommendations(user_id: str, limit: int = 8) -> list[dict]:
    """
    Main entry point.  Returns up to `limit` recommended topics for `user_id`,
    each with an explanation string and composite score.
    """
    all_topics   = _topic_map(user_id)
    progress     = database.get_user_progress(user_id)          # {topic_id: row}
    bookmarks    = {t["id"] for t in database.get_bookmarks(user_id)}
    activity     = database.get_user_activity(user_id, limit=60)
    top_cats     = database.get_top_categories_by_score(user_id)

    completed_ids = {tid for tid, p in progress.items() if p.get("completed")}
    seen_ids      = {a["topic_id"] for a in activity if a.get("topic_id")}
    recent_views  = [
        a["topic_id"] for a in activity
        if a.get("event_type") == "view" and a.get("topic_id")
    ][:10]  # most recent 10 viewed topics

    completed_topics = [all_topics[tid] for tid in completed_ids if tid in all_topics]

    # ── Cold start ────────────────────────────────────────────────────────────
    if len(completed_ids) + len(seen_ids) < 3:
        return _cold_start(all_topics, limit)

    # ── Score accumulator ─────────────────────────────────────────────────────
    scores:  dict[str, float]      = {}
    reasons: dict[str, list[str]]  = {}

    def add(topic_id: str, pts: float, reason: str):
        if topic_id in completed_ids:
            return
        if topic_id not in all_topics:
            return
        scores[topic_id]  = scores.get(topic_id, 0.0) + pts
        reasons.setdefault(topic_id, [])
        if reason not in reasons[topic_id]:
            reasons[topic_id].append(reason)

    graph = get_graph()
    store = get_store()

    # ── Signal 1 — graph_next (40 pts each) ──────────────────────────────────
    # Topics directly reachable from completed topics via PREREQUISITE
    if graph.available and completed_ids:
        graph_recs = graph.get_recommendations_for_user(list(completed_ids), limit=20)
        for r in graph_recs:
            pts = 40 + min(int(r.get("relevance", 1)) * 5, 20)  # bonus for convergence
            add(r["id"], pts, "Ready to learn — prerequisites complete")

    # ── Signal 2 — bookmark_neighbor (25 pts each) ───────────────────────────
    if graph.available and bookmarks:
        for bid in list(bookmarks)[:5]:
            nbr = graph.get_topic_neighborhood(bid)
            bname = all_topics.get(bid, {}).get("name", bid)
            for t in nbr.get("next", []):
                add(t["id"], 25, f"Next after bookmarked: {bname}")
            for t in nbr.get("related", []):
                add(t["id"], 15, f"Related to bookmarked: {bname}")

    # ── Signal 3 — vector_similar (30 pts, decayed by rank) ──────────────────
    # Qdrant similarity to the 3 most recently viewed topics
    for view_id in recent_views[:3]:
        vec_recs = store.get_recommendations(view_id, n_results=6)
        vname = all_topics.get(view_id, {}).get("name", view_id)
        for rank, r in enumerate(vec_recs):
            pts = max(30 - rank * 4, 10)
            add(r["id"], pts, f"Similar to: {vname}")

    # ── Signal 4 — graph_related (20 pts each) ───────────────────────────────
    if graph.available:
        for view_id in recent_views[:5]:
            related = graph.get_related(view_id)
            vname = all_topics.get(view_id, {}).get("name", view_id)
            for t in related:
                add(t["id"], 20, f"Related to: {vname}")

    # ── Signal 5 — category_affinity (15 pts) ────────────────────────────────
    for cat in top_cats[:2]:
        for tid, t in all_topics.items():
            if t.get("category") == cat and tid not in completed_ids:
                add(tid, 15, f"Matches your strength in {cat.replace('_', ' ').title()}")

    # ── Signal 6 — difficulty_progression (10 pts) ───────────────────────────
    target_diff = _next_difficulty(completed_topics)
    if target_diff:
        for tid, t in all_topics.items():
            if t.get("difficulty") == target_diff and tid not in completed_ids:
                add(tid, 10, f"Right difficulty for you ({target_diff})")

    if not scores:
        return _cold_start(all_topics, limit)

    # ── Rank and format ───────────────────────────────────────────────────────
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    results = []
    for tid, score in ranked[:limit]:
        t = all_topics[tid]
        top_reasons = reasons.get(tid, [])[:2]
        results.append({
            "id":          tid,
            "name":        t.get("name", ""),
            "category":    t.get("category", ""),
            "difficulty":  t.get("difficulty", ""),
            "description": t.get("description", ""),
            "score":       round(score, 1),
            "reason":      " · ".join(top_reasons) if top_reasons else "Recommended for you",
            "bookmarked":  tid in bookmarks,
        })
    return results


def _cold_start(all_topics: dict, limit: int) -> list[dict]:
    """
    No user history yet — return beginner topics, then intermediate, sorted
    within each tier by name for a deterministic default feed.
    """
    ordered = sorted(
        all_topics.values(),
        key=lambda t: (_DIFF_ORDER.get(t.get("difficulty", "intermediate"), 1), t.get("name", "")),
    )
    return [
        {
            "id":          t["id"],
            "name":        t.get("name", ""),
            "category":    t.get("category", ""),
            "difficulty":  t.get("difficulty", ""),
            "description": t.get("description", ""),
            "score":       0.0,
            "reason":      "Good starting point",
            "bookmarked":  False,
        }
        for t in ordered[:limit]
    ]


def get_similar_topics(topic_id: str, limit: int = 6) -> list[dict]:
    """
    Simpler per-topic recommendations (no user context).
    Used on the TopicView sidebar: Qdrant similarity + graph neighbors merged.
    """
    graph = get_graph()
    store = get_store()

    seen:   set[str]  = {topic_id}
    result: list[dict] = []

    def _add(t: dict, reason: str):
        if t.get("id") in seen:
            return
        seen.add(t["id"])
        result.append({**t, "reason": reason})

    # Qdrant vector similarity
    for r in store.get_recommendations(topic_id, n_results=limit):
        _add(r, "Semantically similar")

    # Graph neighbors (prereqs + related)
    if graph.available:
        nbr = graph.get_topic_neighborhood(topic_id)
        for t in nbr.get("prerequisites", []):
            _add(t, "Prerequisite")
        for t in nbr.get("next", []):
            _add(t, "Learn next")
        for t in nbr.get("related", []):
            _add(t, "Related topic")

    return result[:limit]
