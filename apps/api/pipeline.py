"""
Content Generation Pipeline.
Given raw crawled content, generates all topic tabs using Ollama (llama3 / qwen2.5).
Stores permanently in topic_content table — never regenerates unless forced.
"""

import json
import re
import httpx
import os

import database
from claude_service import extract_json, _strip_fences

OLLAMA_BASE  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
GEN_MODEL    = os.getenv("PIPELINE_MODEL", "qwen2.5:3b")   # switch to llama3:8b when available
EMBED_MODEL  = os.getenv("EMBED_MODEL",    "nomic-embed-text")

# ── Prompts ───────────────────────────────────────────────────────────────────

LEARN_SYSTEM = """You are an expert DSA teacher writing for AlgoMentor.
Generate a detailed, well-structured markdown explanation of the topic.
Use ## headers, bullet points, and inline `code`. Include:
- What it is (1-2 sentences)
- Core intuition
- How it works step-by-step
- When to use it
- Key insight / trick
Keep it under 600 words. Return ONLY the markdown text, no JSON wrapper."""

STRUCTURED_SYSTEM = """You are an expert DSA content generator for AlgoMentor.
Return ONLY valid JSON, no markdown fences, no extra text.

Output this exact structure:
{
  "complexity_json": {
    "time": {"best": "O(?)", "average": "O(?)", "worst": "O(?)"},
    "space": {"value": "O(?)", "note": "one sentence"},
    "notes": "one practical note about complexity"
  },
  "pseudocode": "step-by-step pseudocode as plain string",
  "code_python": "complete working Python code as plain string",
  "code_java": "complete working Java code as plain string",
  "quiz": [
    {
      "question": "question text",
      "option_a": "first option",
      "option_b": "second option",
      "option_c": "third option",
      "option_d": "fourth option",
      "answer": "A",
      "explanation": "why this answer is correct"
    }
  ]
}

Rules:
- quiz must have exactly 5 questions
- code_python and code_java must be plain strings (not objects)
- pseudocode must be a plain string with real newlines"""


def _call_ollama(system: str, user_msg: str, max_tokens: int = 2000,
                 as_json: bool = False) -> str:
    """Call Ollama and return raw response text."""
    try:
        r = httpx.post(
            f"{OLLAMA_BASE}/api/chat",
            json={
                "model": GEN_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user",   "content": user_msg},
                ],
                "stream": False,
                "keep_alive": "30m",
                "format": "json" if as_json else None,
                "options": {"temperature": 0.1, "num_predict": max_tokens},
            },
            timeout=180,
        )
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "") or ""
    except Exception as e:
        print(f"[pipeline] ollama error: {e}")
        return ""


def _truncate(text: str, max_words: int = 800) -> str:
    """Truncate raw content to max_words to fit in context window."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "\n...[truncated]"


def generate_topic_content(topic_id: str, topic_name: str,
                           raw_content: str, force: bool = False) -> dict | None:
    """
    Generate all tab content for a topic from raw_content.
    Skips if already generated (unless force=True).
    Stores result permanently in topic_content table.
    """
    if not force:
        existing = database.get_topic_content(topic_id)
        if existing and existing.get("learn_content"):
            print(f"[pipeline] {topic_id} already generated — skipping (use force=True to regenerate)")
            return existing

    truncated = _truncate(raw_content)
    print(f"[pipeline] generating content for {topic_name} ({len(truncated.split())} words)...")

    # Step 1: Learn tab (markdown — separate call for better quality)
    print(f"[pipeline]   → learn tab")
    learn_content = _call_ollama(
        LEARN_SYSTEM,
        f"Write the Learn tab for topic: {topic_name}\n\nReference:\n{truncated}",
        max_tokens=1000,
        as_json=False,
    )

    # Step 2: Complexity + code + quiz (single structured JSON call)
    print(f"[pipeline]   → structured data (complexity, code, quiz)")
    raw_json = _call_ollama(
        STRUCTURED_SYSTEM,
        f"Generate complexity, pseudocode, Python code, Java code, and 5 quiz questions for: {topic_name}\n\nReference:\n{truncated}",
        max_tokens=2500,
        as_json=True,
    )

    structured = extract_json(raw_json) if raw_json else {}

    # Normalise code strings (same fixes as _normalise_pseudocode)
    for field in ("code_python", "code_java", "pseudocode"):
        val = structured.get(field)
        if isinstance(val, dict):
            for key in ("code", "working code", "implementation", "solution"):
                if key in val and isinstance(val[key], str):
                    structured[field] = _strip_fences(val[key])
                    break
        elif isinstance(val, str):
            structured[field] = _strip_fences(val)

    # Build animation_json stub (step-by-step for supported topics, placeholder otherwise)
    animation_json = _build_animation_stub(topic_id, topic_name)

    data = {
        "learn_content":   learn_content or f"# {topic_name}\n\nContent coming soon.",
        "complexity_json": structured.get("complexity_json", {}),
        "animation_json":  animation_json,
        "pseudocode":      structured.get("pseudocode", ""),
        "code_python":     structured.get("code_python", ""),
        "code_java":       structured.get("code_java", ""),
        "quiz":            structured.get("quiz", []),
    }

    database.save_topic_content(topic_id, data)
    print(f"[pipeline] {topic_id} ✓ saved")
    return data


def _build_animation_stub(topic_id: str, topic_name: str) -> dict:
    """Return a placeholder animation JSON for unsupported topics."""
    from claude_service import SUPPORTED_ANIMATIONS
    if topic_id in SUPPORTED_ANIMATIONS:
        return {}  # existing animation system handles these
    return {
        "algorithm": topic_name,
        "simulation_available": False,
        "steps": [],
        "note": f"Step-by-step animation for {topic_name} coming soon.",
    }


def generate_all(force: bool = False) -> dict:
    """
    Generate content for every crawled topic that hasn't been generated yet.
    Runs synchronously — call from a background thread.
    """
    topics = database.get_all_topics()
    results = {"success": 0, "skipped": 0, "failed": 0, "no_raw": 0}

    for t in topics:
        if t.get("depth", 1) == 0:
            continue  # skip category nodes

        topic_id   = t["id"]
        topic_name = t["name"]

        # Check if already generated
        if not force and database.get_topic_content(topic_id) and \
                database.get_topic_content(topic_id).get("learn_content"):
            results["skipped"] += 1
            continue

        # Get raw content
        raw_doc = database.get_raw_document(topic_id)
        if not raw_doc:
            print(f"[pipeline] {topic_id} — no raw content, skipping")
            results["no_raw"] += 1
            continue

        result = generate_topic_content(
            topic_id, topic_name, raw_doc["raw_content"], force=force
        )
        if result:
            results["success"] += 1
        else:
            results["failed"] += 1

    print(f"[pipeline] all done — {results}")
    return results


def generate_from_name(topic_id: str, topic_name: str, force: bool = False) -> dict | None:
    """
    Generate content for a single topic that may not have been crawled.
    Falls back to asking Ollama to generate from its training knowledge.
    """
    raw_doc = database.get_raw_document(topic_id)
    raw_content = raw_doc["raw_content"] if raw_doc else \
        f"Generate comprehensive content about the DSA topic: {topic_name}. " \
        f"Cover the algorithm, time complexity, space complexity, implementation, and quiz questions."

    return generate_topic_content(topic_id, topic_name, raw_content, force=force)
