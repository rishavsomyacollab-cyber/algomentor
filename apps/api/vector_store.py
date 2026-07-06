"""
VectorStore — Qdrant-backed semantic search, RAG context, and topic recommendations.

Two collections:
  topics             — one point per topic (search + recommendations)
  explanation_chunks — chunked explanation fields per topic (RAG)

Embeddings via Ollama /api/embeddings with nomic-embed-text (768-dim).
Run: ollama pull nomic-embed-text
"""

import uuid
import httpx
import os
from pathlib import Path
from typing import Optional

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
)

QDRANT_PATH    = str(Path(__file__).parent / "qdrant_db")
QDRANT_URL     = os.getenv("QDRANT_URL")       # set for Qdrant Cloud
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")   # set for Qdrant Cloud
OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
EMBED_DIM   = 768   # nomic-embed-text output dimension

# Deterministic UUID namespace for string topic IDs
_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")

_store: Optional["VectorStore"] = None


def get_store() -> "VectorStore":
    global _store
    if _store is None:
        _store = VectorStore()
    return _store


def _str_uuid(s: str) -> str:
    """Stable UUID from an arbitrary string key."""
    return str(uuid.uuid5(_NS, s))


def _embed(text: str) -> list[float]:
    """Embed a single text string via Ollama."""
    try:
        r = httpx.post(
            f"{OLLAMA_BASE}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
            timeout=30,
        )
        r.raise_for_status()
        vec = r.json().get("embedding", [])
        if not vec:
            raise ValueError("empty embedding returned")
        return vec
    except Exception as e:
        print(f"[vector] embed error: {e}")
        return [0.0] * EMBED_DIM


class VectorStore:
    def __init__(self):
        if QDRANT_URL:
            self.client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
        else:
            self.client = QdrantClient(path=QDRANT_PATH)
        self._ensure_collections()

    def _ensure_collections(self):
        existing = {c.name for c in self.client.get_collections().collections}
        for name in ("topics", "explanation_chunks"):
            if name not in existing:
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=EMBED_DIM, distance=Distance.COSINE),
                )

    # ── Topic indexing ────────────────────────────────────────────────────────

    def index_topics(self, topics: list) -> None:
        """Embed and upsert all topics into the topics collection."""
        points = []
        for t in topics:
            doc = (
                f"{t['name']}. {t.get('description', '')}. "
                f"Category: {t.get('category', '')}. Difficulty: {t.get('difficulty', '')}."
            )
            vec = _embed(doc)
            points.append(PointStruct(
                id=_str_uuid(t["id"]),
                vector=vec,
                payload={
                    "topic_id":    t["id"],
                    "name":        t["name"],
                    "category":    t.get("category", ""),
                    "difficulty":  t.get("difficulty", ""),
                    "description": t.get("description", ""),
                    "_doc":        doc,
                },
            ))
        if points:
            self.client.upsert(collection_name="topics", points=points)

    # ── Explanation chunk indexing ────────────────────────────────────────────

    def index_explanation(self, topic_id: str, topic_name: str, explanation: dict) -> None:
        """Chunk an explanation dict and upsert into the chunks collection."""
        chunks = _extract_chunks(topic_id, topic_name, explanation)
        if not chunks:
            return
        points = []
        for c in chunks:
            vec = _embed(c["text"])
            points.append(PointStruct(
                id=_str_uuid(c["id"]),
                vector=vec,
                payload={**c["meta"], "_doc": c["text"]},
            ))
        if points:
            self.client.upsert(collection_name="explanation_chunks", points=points)

    # ── Semantic search ───────────────────────────────────────────────────────

    def search_topics(self, query: str, n_results: int = 4) -> list:
        """Return the n most semantically similar topics to the query string."""
        try:
            count = self.client.count("topics").count
            if count == 0:
                return []
            vec = _embed(query)
            results = self.client.query_points(
                collection_name="topics",
                query=vec,
                limit=min(n_results, count),
                with_payload=True,
            ).points
            return [
                {
                    "id":          r.payload["topic_id"],
                    "name":        r.payload.get("name", ""),
                    "category":    r.payload.get("category", ""),
                    "difficulty":  r.payload.get("difficulty", ""),
                    "description": r.payload.get("description", ""),
                    "score":       round(max(0.0, r.score) * 100, 1),
                }
                for r in results
            ]
        except Exception as e:
            print(f"[vector] search error: {e}")
            return []

    # ── Recommendations ───────────────────────────────────────────────────────

    def get_recommendations(self, topic_id: str, n_results: int = 3) -> list:
        """Return n topics most similar to topic_id, excluding itself."""
        try:
            uid = _str_uuid(topic_id)
            pts = self.client.retrieve(collection_name="topics", ids=[uid], with_vectors=True)
            if not pts:
                return []
            vec = pts[0].vector
            count = self.client.count("topics").count
            results = self.client.query_points(
                collection_name="topics",
                query=vec,
                limit=min(n_results + 1, count),
                with_payload=True,
            ).points
            out = []
            for r in results:
                if r.payload.get("topic_id") == topic_id:
                    continue
                out.append({
                    "id":          r.payload["topic_id"],
                    "name":        r.payload.get("name", ""),
                    "category":    r.payload.get("category", ""),
                    "difficulty":  r.payload.get("difficulty", ""),
                    "description": r.payload.get("description", ""),
                    "score":       round(max(0.0, r.score) * 100, 1),
                })
                if len(out) >= n_results:
                    break
            return out
        except Exception as e:
            print(f"[vector] recommend error: {e}")
            return []

    # ── RAG context retrieval ─────────────────────────────────────────────────

    def get_rag_context(self, query: str, exclude_topic_id: str, n_results: int = 4) -> str:
        """Retrieve the most relevant explanation chunks from OTHER topics for RAG injection."""
        try:
            total = self.client.count("explanation_chunks").count
            if total == 0:
                return ""
            vec = _embed(query)
            results = self.client.query_points(
                collection_name="explanation_chunks",
                query=vec,
                limit=min(n_results, total),
                with_payload=True,
                query_filter=Filter(
                    must_not=[
                        FieldCondition(
                            key="topic_id",
                            match=MatchValue(value=exclude_topic_id),
                        )
                    ]
                ),
            ).points
            lines = [
                f"[{r.payload.get('topic_name', '?')} — {r.payload.get('section', '?')}] "
                f"{r.payload.get('_doc', '')}"
                for r in results
            ]
            return "\n".join(lines)
        except Exception as e:
            print(f"[vector] rag context error: {e}")
            return ""


# ── Chunk extraction helper ───────────────────────────────────────────────────

def _extract_chunks(topic_id: str, topic_name: str, exp: dict) -> list:
    chunks = []

    def add(section: str, text: str, idx: int = 0):
        if not text or not str(text).strip():
            return
        chunks.append({
            "id":   f"{topic_id}:{section}:{idx}",
            "text": str(text).strip(),
            "meta": {
                "topic_id":    topic_id,
                "topic_name":  topic_name,
                "section":     section,
                "chunk_index": idx,
            },
        })

    add("introduction", exp.get("introduction", ""))
    add("intuition",    exp.get("intuition", ""))

    for i, step in enumerate(exp.get("how_it_works", [])):
        add("how_it_works", step, i)
    for i, tip in enumerate(exp.get("tips", [])):
        add("tips", tip, i)
    for i, adv in enumerate(exp.get("advantages", [])):
        add("advantages", adv, i)
    for i, app in enumerate(exp.get("applications", [])):
        add("applications", app, i)
    for i, m in enumerate(exp.get("common_mistakes", [])):
        if isinstance(m, dict):
            add("mistakes", f"{m.get('title', '')}: {m.get('description', '')}", i)
        else:
            add("mistakes", str(m), i)
    for i, s in enumerate((exp.get("worked_example") or {}).get("steps", [])):
        add("worked_example", s, i)

    return chunks
