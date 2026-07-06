from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx
import threading
import database
import claude_service

app = FastAPI(title="AlgoMentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _prewarm():
    """Load model into memory, then generate + cache every topic that isn't already cached."""
    # 1. warm the model
    try:
        httpx.post(
            f"{claude_service.OLLAMA_BASE}/api/chat",
            json={
                "model": claude_service.MODEL,
                "messages": [{"role": "user", "content": "hi"}],
                "stream": False,
                "options": {"num_predict": 1},
            },
            timeout=120,
        )
    except Exception:
        pass
    # 2. fill any missing cache entries
    claude_service.prewarm_all()


@app.on_event("startup")
def startup():
    database.init_db()
    threading.Thread(target=_prewarm, daemon=True).start()


# ── Request models ───────────────────────────────────────────────────────────

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


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/api/topics")
def list_topics():
    return database.get_all_topics()


@app.get("/api/progress")
def get_progress():
    return database.get_progress()


@app.post("/api/explain")
def explain(req: ExplainRequest):
    result = claude_service.explain_topic(req.topic_id, req.topic_name)
    return result or {}  # always 200 — frontend falls back to built-in content


@app.post("/api/animate")
def animate(req: AnimateRequest):
    result = claude_service.get_animation(req.topic_id, req.topic_name, req.input_array, req.target)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get animation")
    return result


@app.get("/api/pseudocode/{topic_id}")
def pseudocode(topic_id: str):
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    result = claude_service.get_pseudocode(topic_id, topic["name"])
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get pseudocode")
    return result


@app.get("/api/complexity/{topic_id}")
def complexity(topic_id: str):
    topic = database.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    result = claude_service.analyze_complexity(topic_id, topic["name"])
    if not result:
        raise HTTPException(status_code=500, detail="Failed to analyze complexity")
    return result


@app.post("/api/quiz/generate")
def generate_quiz(req: QuizGenerateRequest):
    result = claude_service.generate_quiz(req.topic_id, req.topic_name, req.difficulty, req.count)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate quiz")
    return result


@app.post("/api/quiz/evaluate")
def evaluate_answer(req: EvaluateRequest):
    result = claude_service.evaluate_answer(
        req.topic_name, req.question, req.options, req.correct_index, req.user_index
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to evaluate answer")
    return result


@app.post("/api/quiz/hint")
def get_hint(req: HintRequest):
    result = claude_service.get_hint(req.topic_name, req.question, req.options, req.hint_level)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get hint")
    return result


@app.post("/api/progress")
def update_progress(req: ProgressRequest):
    database.save_progress(req.topic_id, req.completed, req.quiz_score)
    return {"status": "saved"}


@app.post("/api/chat")
def chat(req: ChatRequest):
    result = claude_service.chat_message(req.message, req.topic_name)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to get response")
    return result
