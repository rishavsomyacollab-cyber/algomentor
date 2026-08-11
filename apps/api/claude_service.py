import json
import re
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
QUIZ_MODEL = os.getenv("QUIZ_MODEL", "llama3.2:3b")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GROQ_API_KEY      = os.getenv("GROQ_API_KEY")
CLAUDE_FAST_MODEL  = "claude-haiku-4-5-20251001"
CLAUDE_SMART_MODEL = "claude-sonnet-4-6"
CLAUDE_QUIZ_MODEL  = CLAUDE_FAST_MODEL
GROQ_SMART_MODEL   = "llama-3.3-70b-versatile"
GROQ_FAST_MODEL    = "llama-3.1-8b-instant"


def _claude_json(system: str, user_msg: str, max_tokens: int = 1500, model: str = None) -> dict:
    """Call Claude API → Groq → Ollama fallback chain."""
    if not ANTHROPIC_API_KEY:
        result = _groq_json(system, user_msg, max_tokens)
        return result if result else _ollama_json(system, user_msg, max_tokens)
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=model or CLAUDE_FAST_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        text = msg.content[0].text if msg.content else ""
        text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
        return extract_json(text) if text else {}
    except Exception as e:
        if "credit balance" in str(e):
            print(f"[claude] no API credits — trying Groq")
        else:
            print(f"[claude] error, trying Groq: {e}")
        result = _groq_json(system, user_msg, max_tokens)
        return result if result else _ollama_json(system, user_msg, max_tokens)


def _claude_text(system: str, user_msg: str, max_tokens: int = 800) -> str:
    """Call Claude API → Groq → Ollama fallback chain, return plain text."""
    if not ANTHROPIC_API_KEY:
        result = _groq_text(system, user_msg, max_tokens)
        return result if result else _ollama_text(system, user_msg, max_tokens)
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model=CLAUDE_FAST_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        return msg.content[0].text if msg.content else ""
    except Exception as e:
        print(f"[claude] text error, trying Groq: {e}")
        result = _groq_text(system, user_msg, max_tokens)
        return result if result else _ollama_text(system, user_msg, max_tokens)


def _claude_stream(system: str, user_msg: str, max_tokens: int = 1200):
    """Stream tokens: Claude API → Groq → Ollama fallback chain."""
    if not ANTHROPIC_API_KEY:
        tokens = list(_groq_stream(system, user_msg, max_tokens))
        if tokens:
            yield from tokens
        else:
            yield from _ollama_stream(system, user_msg, max_tokens)
        return
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        with client.messages.stream(
            model=CLAUDE_FAST_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        ) as stream:
            for text in stream.text_stream:
                yield text
    except Exception as e:
        print(f"[claude] stream error, trying Groq: {e}")
        tokens = list(_groq_stream(system, user_msg, max_tokens))
        if tokens:
            yield from tokens
        else:
            yield from _ollama_stream(system, user_msg, max_tokens)


# ── Cache helpers ────────────────────────────────────────────────────────────

def _cache_get(fn: str, topic_id: str):
    import database
    return database.cache_get(f"{fn}:{topic_id}")


def _cache_set(fn: str, topic_id: str, value: dict):
    import database
    database.cache_set(f"{fn}:{topic_id}", value)


# ── Groq helpers ─────────────────────────────────────────────────────────────

def _groq_json(system: str, user_msg: str, max_tokens: int = 1500, model: str = None) -> dict:
    """Call Groq API, return parsed JSON. Returns {} on failure."""
    if not GROQ_API_KEY:
        return {}
    try:
        r = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": model or GROQ_SMART_MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
                "max_tokens": max_tokens,
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        return extract_json(text) if text else {}
    except Exception as e:
        print(f"[groq] error: {e}")
        return {}


def _groq_text(system: str, user_msg: str, max_tokens: int = 800, model: str = None) -> str:
    """Call Groq API, return plain text."""
    if not GROQ_API_KEY:
        return ""
    try:
        r = httpx.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": model or GROQ_FAST_MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            timeout=60,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"[groq] text error: {e}")
        return ""


def _groq_stream(system: str, user_msg: str, max_tokens: int = 1200):
    """Stream tokens from Groq API."""
    if not GROQ_API_KEY:
        return
    try:
        with httpx.stream(
            "POST",
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": GROQ_FAST_MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
                "max_tokens": max_tokens,
                "temperature": 0.3,
                "stream": True,
            },
            timeout=60,
        ) as resp:
            for line in resp.iter_lines():
                if line.startswith("data: ") and line != "data: [DONE]":
                    try:
                        chunk = json.loads(line[6:])
                        token = chunk["choices"][0]["delta"].get("content", "")
                        if token:
                            yield token
                    except Exception:
                        pass
    except Exception as e:
        print(f"[groq] stream error: {e}")


# ── Ollama helpers ────────────────────────────────────────────────────────────

def _ollama_json(system: str, user_msg: str, max_tokens: int = 1200, model: str = None) -> dict:
    """Call Ollama, return parsed JSON. Returns {} on failure."""
    try:
        r = httpx.post(f"{OLLAMA_BASE}/api/chat", json={
            "model": model or MODEL,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
            "stream": False, "format": "json", "keep_alive": "30m",
            "options": {"temperature": 0.1, "num_predict": max_tokens},
        }, timeout=120)
        r.raise_for_status()
        text = r.json().get("message", {}).get("content", "")
        return extract_json(text) if text else {}
    except Exception as e:
        print(f"[ollama] error: {e}")
        return {}


def _ollama_stream(system: str, user_msg: str, max_tokens: int = 1200):
    """Stream tokens from Ollama. Yields text chunks."""
    try:
        with httpx.stream("POST", f"{OLLAMA_BASE}/api/chat", json={
            "model": MODEL,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
            "stream": True, "keep_alive": "30m",
            "options": {"temperature": 0.3, "num_predict": max_tokens},
        }, timeout=120) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        chunk = data.get("message", {}).get("content", "")
                        if chunk:
                            yield chunk
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        pass
    except Exception as e:
        print(f"[ollama-stream] error: {e}")
        yield ""


def stream_explain(topic_id: str, topic_name: str):
    """Stream a plain-text explanation of a topic."""
    system = (
        "You are an expert DSA teacher. Explain this algorithm clearly and engagingly. "
        "Cover: what it is, the core intuition, how it works step by step, and a quick example. "
        "Keep it educational but conversational. Use plain text, no markdown headers."
    )
    yield from _claude_stream(system, f"Explain {topic_name} for a software engineering student.", max_tokens=800)


def _ollama_text(system: str, user_msg: str, max_tokens: int = 600) -> str:
    """Call Ollama, return plain text. Returns '' on failure."""
    try:
        r = httpx.post(f"{OLLAMA_BASE}/api/chat", json={
            "model": MODEL,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user_msg}],
            "stream": False, "keep_alive": "30m",
            "options": {"temperature": 0.7, "num_predict": max_tokens},
        }, timeout=120)
        r.raise_for_status()
        return r.json().get("message", {}).get("content", "")
    except Exception as e:
        print(f"[ollama] error: {e}")
        return ""


# ── System prompts ─────────────────────────────────────────────────────────────

EXPLAINER_SYSTEM = """You are AlgoMentor's Explainer — a world-class DSA tutor. Produce a comprehensive, GeeksForGeeks-quality lesson.

Return ONLY a valid JSON object (no markdown fences, no extra text):
{
  "concept": "algorithm/data-structure name",
  "tagline": "one punchy sentence capturing the core idea",
  "introduction": "4-5 sentences: what it is, why it matters, key prerequisite, where it shines",
  "intuition": "2-3 sentence real-world analogy that makes the idea click instantly for a beginner",
  "how_it_works": [
    "Step 1: concrete action with detail",
    "Step 2: ...",
    "...at least 6 steps total..."
  ],
  "worked_example": {
    "label": "short description of the concrete input (e.g. 'Find 7 in [1,3,5,7,9,11,13]')",
    "steps": [
      "State line 1: show actual values, pointers, decision (e.g. 'left=0, right=6, mid=3 → arr[3]=7 == target')",
      "State line 2: ...",
      "...3-6 lines total..."
    ],
    "result": "final outcome of the example"
  },
  "code": "clean, commented Python implementation (12-18 lines, no fluff)",
  "time_complexity": {
    "best": "O(...)",
    "average": "O(...)",
    "worst": "O(...)",
    "note": "one sentence explaining why"
  },
  "space_complexity": {
    "value": "O(...)",
    "note": "one sentence explaining why"
  },
  "advantages": ["advantage 1", "advantage 2", "advantage 3"],
  "disadvantages": ["disadvantage 1", "disadvantage 2"],
  "applications": [
    "real-world use case 1",
    "real-world use case 2",
    "real-world use case 3",
    "real-world use case 4"
  ],
  "common_mistakes": [
    {
      "title": "concise mistake name",
      "description": "what the mistake is, why it happens, and exactly how to fix it"
    }
  ],
  "tips": [
    "practical tip 1 for using or implementing this efficiently",
    "practical tip 2",
    "practical tip 3"
  ],
  "fun_fact": "one genuinely surprising or historically interesting fact",
  "prerequisites": ["exact DSA topic name 1", "exact DSA topic name 2"]
}

Rules:
- worked_example.steps must show CONCRETE values at every state — no vague descriptions
- code must be runnable Python — no pseudocode, no placeholders
- all arrays must have at least the minimum count shown above
- prerequisites: use ONLY these exact names (pick whichever apply):
  "Array", "Recursion", "Sorting", "Binary Search", "Two Pointers", "Sliding Window",
  "Linked List", "Stack", "Queue", "Binary Tree", "Graph", "Hash Map",
  "Dynamic Programming", "BFS", "DFS", "Merge Sort", "Big O Notation"
- Never write "pointer" alone — always "Two Pointers" in full"""

PSEUDOCODE_SYSTEM = """You are AlgoMentor's Code Teacher.

Return ONLY valid JSON, no markdown fences, no extra text.
Rules:
- "python": complete, runnable Python function(s) with CORRECT 4-space indentation — every line inside a def/for/if/while MUST be indented
- "java": complete Java method(s) with correct braces and indentation
- "pseudocode": step-by-step plain-English algorithm description
- "key_lines": line numbers of the most important lines in each language
- "line_notes": one-sentence explanation for each key line

JSON format:
{"algorithm":"name","pseudocode":"step by step description","python":"def solution(...):\\n    # complete code here","java":"public type solution(...) {\\n    // complete code here\\n}","key_lines":{"python":[1,3],"java":[1,3]},"line_notes":{"python":{"1":"note"},"java":{"1":"note"}}}"""

QUIZMASTER_SYSTEM = """You are AlgoMentor's Quizmaster.

For questions, return ONLY valid JSON with ALL requested questions, no markdown fences:
{"questions":[{"id":"q1","question":"First question text?","options":["A. option","B. option","C. option","D. option"],"correct_index":0,"explanation":"brief why","difficulty":"medium","topic_aspect":"aspect","type":"concept"},{"id":"q2","question":"What does this code output?\\nfor i in range(n):\\n    if arr[i] > arr[i+1]: swap(arr, i, i+1)","options":["A. option","B. option","C. option","D. option"],"correct_index":1,"explanation":"brief why","difficulty":"medium","topic_aspect":"code","type":"code"}]}

IMPORTANT rules — follow ALL of them:
1. Generate EXACTLY the requested number of questions.
2. EXACTLY ONE question must be a code-reading or code-tracing question (type "code") — show a short code snippet in the question and ask what it does, its output, or its complexity.
3. All other questions (type "concept") test different conceptual aspects — no two questions test the same thing.
4. The "variant" seed passed in the prompt means you must generate a DIFFERENT set from previous variants — use different examples, edge cases, and code snippets.

For evaluation, return ONLY:
{"correct":true,"score":80,"feedback":"one sentence feedback","explanation":"brief explanation"}

For hints, return ONLY:
{"hint":"one helpful nudge","hint_level":1}"""

# Lean system prompt used only for quiz bank generation (no eval/hint cruft)
QUIZ_BANK_SYSTEM = """Return ONLY valid JSON, no markdown fences, no extra text.

Format: {"questions":[{"id":"q1","question":"question text only — no options here","options":["A. first option","B. second option","C. third option","D. fourth option"],"correct_index":0,"explanation":"one sentence why","type":"concept"}]}

Rules:
- "options" array must contain the full option text — NEVER embed options inside "question"
- type="code": show a short Python snippet in the question, ask what it does/outputs/its complexity
- type="concept": test understanding, definitions, trade-offs
- correct_index is 0-3 (0=A, 1=B, 2=C, 3=D)
- each question tests a DIFFERENT aspect"""

COMPLEXITY_SYSTEM = """You are AlgoMentor's Complexity Analyst. Show exact mathematical derivations.

Return ONLY valid JSON, no markdown fences, no extra text:
{
  "algorithm": "name",
  "recurrence_relation": "T(n) = 2T(n/2) + O(n)  [omit field if purely iterative]",
  "time_complexity": {
    "best":    "O(?)",
    "best_reasoning":   "one plain-English sentence",
    "best_derivation":  ["step 1 with math", "step 2", "∴ O(?)"],
    "average": "O(?)",
    "average_reasoning":   "one plain-English sentence",
    "average_derivation":  ["step 1 with math", "step 2", "∴ O(?)"],
    "worst":   "O(?)",
    "worst_reasoning":   "one plain-English sentence",
    "worst_derivation":  ["step 1 with math", "step 2", "∴ O(?)"]
  },
  "space_complexity": {
    "value": "O(?)",
    "reasoning": "one plain-English sentence",
    "derivation": ["step 1 with math", "step 2", "∴ O(?)"]
  },
  "comparison_to_alternatives": [{"algorithm":"name","time":"O(?)","notes":"when to prefer"}],
  "practical_notes": "one sentence"
}

Rules for derivation arrays — use real math, not hand-waving:
• Iterative loops: count iterations symbolically then sum.
  Bubble Sort worst: ["Outer loop: n-1 passes", "Inner loop on pass i: n-1-i comparisons", "Total = Σᵢ₌₀ⁿ⁻¹(n-1-i) = (n-1)+(n-2)+…+1 = n(n-1)/2", "n(n-1)/2 = O(n²)", "∴ O(n²)"]
• Divide-and-conquer: write recurrence then apply Master Theorem.
  Merge Sort: ["Recurrence: T(n) = 2T(n/2) + O(n)", "Master Theorem: a=2, b=2, f(n)=n", "log_b(a) = log₂2 = 1, f(n) = n¹ = Θ(n^log_b a)", "Case 2 → T(n) = Θ(n log n)", "∴ O(n log n)"]
• Search halving: show how halving leads to log.
  Binary Search: ["Each step halves the search space: n → n/2 → n/4 → … → 1", "After k steps: n/2ᵏ = 1 → k = log₂n", "Each step is O(1)", "∴ O(log n)"]
• Last item in derivation array must start with ∴"""

CHAT_SYSTEM = """You are AlgoMentor's DSA tutor assistant. Help students understand algorithms and data structures.

Rules:
- Keep answers focused and clear (2-5 sentences for simple questions, more for complex ones)
- Use Python code examples when helpful — wrap them in ```python ... ``` blocks
- Relate answers to the algorithm being studied when context is given
- Be encouraging — learners may be beginners
- Never output JSON; always respond in plain conversational text"""


# ── JSON extraction utility ───────────────────────────────────────────────────

def extract_json(text: str):
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    start = next((i for i, c in enumerate(text) if c in "{["), -1)
    if start >= 0:
        for end in range(len(text), start, -1):
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                continue

    return {"raw": text}


# ── Algorithm simulations ─────────────────────────────────────────────────────

def _simulate_binary_search(arr: list, target: float) -> dict:
    steps = []
    left, right = 0, len(arr) - 1
    step_num = 1
    found_idx = -1

    while left <= right:
        mid = (left + right) // 2
        colors = {str(i): "default" for i in range(len(arr))}
        colors[str(left)] = "boundary"
        colors[str(right)] = "boundary"
        colors[str(mid)] = "active"

        comparison = f"arr[{mid}]={arr[mid]} vs target={target}"
        if arr[mid] == target:
            colors[str(mid)] = "found"
            decision = "found!"
            found_idx = mid
        elif arr[mid] < target:
            decision = "go right (left = mid+1)"
        else:
            decision = "go left (right = mid-1)"

        steps.append({
            "step_number": step_num,
            "array_state": list(arr),
            "pointers": {"left": left, "right": right, "mid": mid},
            "highlighted_indices": [mid],
            "colors": colors,
            "variables": {"target": target, "left": left, "right": right, "mid": mid},
            "comparison": comparison,
            "decision": decision,
        })
        step_num += 1

        if arr[mid] == target:
            break
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return {
        "steps": steps,
        "total_steps": len(steps),
        "result": f"found at index {found_idx}" if found_idx >= 0 else "not found",
    }


def _simulate_bubble_sort(arr: list) -> dict:
    arr = list(arr)
    steps = []
    n = len(arr)
    step_num = 1

    for i in range(n):
        swapped = False
        for j in range(n - i - 1):
            colors = {str(k): "default" for k in range(n)}
            for k in range(n - i, n):
                colors[str(k)] = "sorted"
            colors[str(j)] = "comparing"
            colors[str(j + 1)] = "comparing"

            comparison = f"arr[{j}]={arr[j]} > arr[{j+1}]={arr[j+1]}?"
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                decision = f"swap → {arr[j]} and {arr[j+1]}"
                swapped = True
            else:
                decision = "no swap"

            steps.append({
                "step_number": step_num,
                "array_state": list(arr),
                "pointers": {"i": i, "j": j},
                "highlighted_indices": [j, j + 1],
                "colors": colors,
                "variables": {"pass": i + 1, "comparing_at": j},
                "comparison": comparison,
                "decision": decision,
            })
            step_num += 1

        if not swapped:
            break

    return {"steps": steps, "total_steps": len(steps), "result": str(arr)}


def _simulate_merge_sort(arr: list) -> dict:
    steps = []
    step_num = [1]
    arr = list(arr)

    def merge_sort_trace(a, left_offset=0):
        if len(a) <= 1:
            return a
        mid = len(a) // 2
        left_part = merge_sort_trace(a[:mid], left_offset)
        right_part = merge_sort_trace(a[mid:], left_offset + mid)

        merged = []
        i = j = 0
        while i < len(left_part) and j < len(right_part):
            comparison = f"{left_part[i]} vs {right_part[j]}"
            if left_part[i] <= right_part[j]:
                merged.append(left_part[i])
                decision = f"take left: {left_part[i]}"
                i += 1
            else:
                merged.append(right_part[j])
                decision = f"take right: {right_part[j]}"
                j += 1

            temp_arr = list(arr)
            for k, v in enumerate(merged):
                temp_arr[left_offset + k] = v

            steps.append({
                "step_number": step_num[0],
                "array_state": temp_arr,
                "pointers": {"merge_start": left_offset, "merge_mid": left_offset + mid, "merge_end": left_offset + len(a)},
                "highlighted_indices": [left_offset + len(merged) - 1],
                "colors": {str(left_offset + k): "merging" for k in range(len(a))},
                "variables": {"left_ptr": i, "right_ptr": j, "merging_subarray": f"[{left_offset}:{left_offset+len(a)}]"},
                "comparison": comparison,
                "decision": decision,
            })
            step_num[0] += 1

        merged.extend(left_part[i:])
        merged.extend(right_part[j:])
        for k, v in enumerate(merged):
            arr[left_offset + k] = v
        return merged

    merge_sort_trace(arr)
    return {"steps": steps, "total_steps": len(steps), "result": str(arr)}


# ── Step descriptions (no LLM) ────────────────────────────────────────────────

def _add_descriptions(topic_id: str, sim_data: dict) -> list:
    enriched = []
    for s in sim_data["steps"]:
        step = dict(s)
        comp = s.get("comparison", "")
        dec = s.get("decision", "")
        pts = s.get("pointers", {})
        vars_ = s.get("variables", {})
        arr_state = s.get("array_state", [])

        if topic_id == "binary_search":
            mid = pts.get("mid")
            left = pts.get("left", 0)
            right = pts.get("right", 0)
            mid_val = arr_state[mid] if isinstance(mid, int) and mid < len(arr_state) else "?"
            if "found" in dec:
                desc = f"Found! Index {mid} holds value {mid_val} — that's our target. Search complete in {s['step_number']} step(s)."
            elif "right" in dec:
                desc = f"Check index {mid} → value {mid_val}. Target is larger, so discard the left half. New search range: [{mid+1}..{right}]."
            elif "left" in dec:
                desc = f"Check index {mid} → value {mid_val}. Target is smaller, so discard the right half. New search range: [{left}..{mid-1}]."
            else:
                desc = f"Step {s['step_number']}: {comp}. {dec}."

        elif topic_id == "bubble_sort":
            pass_ = vars_.get("pass", 1)
            j = pts.get("j", 0)
            if dec.startswith("swap"):
                desc = f"Pass {pass_}: Compare positions {j} and {j+1}. {comp} — yes, out of order! Swap them so the larger value bubbles right."
            else:
                desc = f"Pass {pass_}: Compare positions {j} and {j+1}. {comp} — already in order, no swap needed."

        elif topic_id == "merge_sort":
            subarray = vars_.get("merging_subarray", "this subarray")
            if "left" in dec:
                val = dec.replace("take left: ", "")
                desc = f"Merging {subarray}: compare {comp}. Left value {val} is ≤ right, so place {val} next in the merged output."
            elif "right" in dec:
                val = dec.replace("take right: ", "")
                desc = f"Merging {subarray}: compare {comp}. Right value {val} is smaller, so place {val} next in the merged output."
            else:
                desc = f"Merge step for {subarray}: {comp}. {dec}."

        else:
            desc = f"Step {s['step_number']}: {comp}. {dec}."

        step["description"] = desc
        enriched.append(step)
    return enriched


SUPPORTED_ANIMATIONS = {"binary_search", "bubble_sort", "merge_sort"}


def get_animation(topic_id: str, topic_name: str, input_array: list = None, target=None) -> dict:
    arr = input_array or [4, 2, 7, 1, 9, 3, 8, 5]
    simulation_available = topic_id in SUPPORTED_ANIMATIONS

    if not simulation_available:
        return {
            "algorithm": topic_name,
            "simulation_available": False,
            "steps": [],
            "total_steps": 0,
            "result": "",
            "input": {"array": arr, "target": target},
        }

    if topic_id == "binary_search":
        arr = sorted(arr)
        if target is None:
            target = arr[len(arr) // 2]

    algo_map = {
        "binary_search": lambda: _simulate_binary_search(arr, target),
        "bubble_sort":   lambda: _simulate_bubble_sort(arr),
        "merge_sort":    lambda: _simulate_merge_sort(arr),
    }
    sim_data = algo_map[topic_id]()
    steps = _add_descriptions(topic_id, sim_data)
    return {
        "algorithm": topic_name,
        "simulation_available": True,
        "input": {"array": arr, "target": target},
        "steps": steps,
        "total_steps": sim_data["total_steps"],
        "result": sim_data["result"],
    }


# ── Public API ────────────────────────────────────────────────────────────────

def explain_topic(topic_id: str, topic_name: str) -> dict:
    cached = _cache_get("explain", topic_id)
    if cached:
        return cached

    # RAG: pull relevant context from already-indexed topics to enrich the response
    rag_prefix = ""
    try:
        from vector_store import get_store
        ctx = get_store().get_rag_context(
            query=f"explain {topic_name} algorithm data structure",
            exclude_topic_id=topic_id,
            n_results=4,
        )
        if ctx:
            rag_prefix = (
                f"RELATED CONTEXT FROM OTHER TOPICS (use as background knowledge):\n{ctx}\n\n"
            )
    except Exception:
        pass

    result = _claude_json(
        EXPLAINER_SYSTEM,
        rag_prefix + f"Explain the '{topic_name}' algorithm/data structure in depth.",
        max_tokens=2048,
        model=CLAUDE_SMART_MODEL,
    )
    if result and result.get("concept"):
        _cache_set("explain", topic_id, result)
    return result


def _strip_fences(s: str) -> str:
    """Normalise code strings: handle double-JSON-encoding, markdown fences, and escape sequences."""
    s = s.strip()
    # If the LLM double-JSON-encoded the value (starts/ends with quotes), decode it
    if s.startswith('"') and s.endswith('"'):
        try:
            s = json.loads(s)
        except (json.JSONDecodeError, ValueError):
            pass
    # Strip markdown code fences
    s = re.sub(r"^```[\w]*\s*", "", s.strip())
    s = re.sub(r"\s*```\s*$", "", s.strip())
    # Unescape literal \n and \t that the LLM wrote as text
    s = s.replace("\\n", "\n").replace("\\t", "\t")
    return s.strip()


def _normalise_pseudocode(result: dict) -> dict:
    """Fix common LLM output quirks for python/java fields."""
    for lang in ("python", "java"):
        val = result.get(lang)
        if val is None:
            result[lang] = ""
        elif isinstance(val, list):
            # LLM sometimes returns a list of code lines or line numbers
            str_items = [str(v) for v in val if isinstance(v, str) and len(v) > 2]
            result[lang] = _strip_fences("\n".join(str_items)) if str_items else ""
        elif isinstance(val, dict):
            # Try common keys the model uses for the code string
            for key in ("working code", "code", "implementation", "solution", "working_code"):
                if key in val and isinstance(val[key], str):
                    result[lang] = _strip_fences(val[key])
                    break
            else:
                # Grab the first long string value
                for v in val.values():
                    if isinstance(v, str) and len(v) > 20:
                        result[lang] = _strip_fences(v)
                        break
                else:
                    result[lang] = ""
        elif isinstance(val, str):
            result[lang] = _strip_fences(val)
    return result


def _code_is_complete(result: dict) -> bool:
    """Return True only when both python and java are non-empty strings."""
    return (
        isinstance(result.get("python"), str) and len(result["python"].strip()) > 10 and
        isinstance(result.get("java"),   str) and len(result["java"].strip())   > 10
    )


def get_pseudocode(topic_id: str, topic_name: str) -> dict:
    cached = _cache_get("pseudocode", topic_id)
    # Skip cache if python/java are missing or empty (corrupted entry)
    if cached and _code_is_complete(cached):
        return cached

    for attempt in range(3):
        prompt = (
            f"Write the complete Python and Java implementation for '{topic_name}'. "
            "Include the full function body with ALL lines — do not truncate or abbreviate. "
            "Python MUST use proper 4-space indentation on every line inside a block."
            + (" Expand the code fully, do not shorten." if attempt > 0 else "")
        )
        result = _claude_json(PSEUDOCODE_SYSTEM, prompt, max_tokens=2048, model=CLAUDE_SMART_MODEL)
        if result:
            result = _normalise_pseudocode(result)
            if _code_is_complete(result):
                break
    else:
        result = result or {}

    if result:
        _cache_set("pseudocode", topic_id, result)
    return result


def analyze_complexity(topic_id: str, topic_name: str) -> dict:
    cached = _cache_get("complexity_v2", topic_id)
    if cached:
        return cached
    result = _claude_json(
        COMPLEXITY_SYSTEM,
        f"Analyze time and space complexity of '{topic_name}' with full mathematical derivations.",
        max_tokens=1600,
        model=CLAUDE_SMART_MODEL,
    )
    if result:
        _cache_set("complexity_v2", topic_id, result)
    return result


QUIZ_BANK_TARGET = 15   # questions per topic per difficulty
QUIZ_BATCH_SIZE  = 5    # smaller batches = more topics covered sooner

def _build_quiz_bank_batch(topic_id: str, topic_name: str, difficulty: str, batch_num: int) -> int:
    """Generate one batch of QUIZ_BATCH_SIZE questions and insert into quiz_bank. Returns count inserted."""
    import database
    focus_hints = [
        "time/space complexity and definitions",
        "edge cases and common bugs",
        "step-by-step algorithm traces",
        "comparisons with alternative approaches",
        "real-world applications and optimisations",
    ]
    focus = focus_hints[batch_num % len(focus_hints)]
    prompt = (
        f"Generate exactly {QUIZ_BATCH_SIZE} MCQ questions about '{topic_name}' ({difficulty} level). "
        f"Focus on: {focus}. "
        f"Include exactly 1 code-tracing question (type='code') with a short Python snippet. "
        f"Other questions use type='concept'. "
        f"Return the JSON array."
    )
    result = _claude_json(QUIZ_BANK_SYSTEM, prompt, max_tokens=1200)
    questions = result.get("questions", []) if result else []
    if questions:
        database.insert_quiz_questions(topic_id, difficulty, questions)
    return len(questions)


def build_quiz_bank(topic_id: str, topic_name: str, difficulty: str) -> None:
    """Ensure quiz_bank has QUIZ_BANK_TARGET questions for this topic+difficulty."""
    import database
    current = database.get_quiz_bank_count(topic_id, difficulty)
    if current >= QUIZ_BANK_TARGET:
        return
    batch_num = current // QUIZ_BATCH_SIZE
    needed = QUIZ_BANK_TARGET - current
    batches = (needed + QUIZ_BATCH_SIZE - 1) // QUIZ_BATCH_SIZE
    for i in range(batches):
        inserted = _build_quiz_bank_batch(topic_id, topic_name, difficulty, batch_num + i)
        if inserted == 0:
            break  # model failed, stop


def get_quiz_from_bank(topic_id: str, topic_name: str, difficulty: str = "medium", count: int = 5) -> dict:
    """Pure DB fetch — never generates at runtime.
    Returns {"preparing": True} when the startup background job hasn't reached this topic yet.
    """
    import database
    questions = database.get_random_quiz_questions(topic_id, difficulty, count)
    if len(questions) >= count:
        return {"questions": questions}
    return {"preparing": True}


def fill_quiz_bank_all(topics: list = None) -> None:
    """Fill the quiz bank for every topic × difficulty in a background thread.
    Sleeps 8s between batches so user-triggered quiz requests can always get Ollama."""
    import database, time
    if topics is None:
        topics = database.get_all_topics()
    total = 0
    for t in topics:
        for diff in ("easy", "medium", "hard"):
            try:
                current = database.get_quiz_bank_count(t["id"], diff)
                if current >= QUIZ_BANK_TARGET:
                    continue
                # Only generate one batch at a time, then yield so user requests slip through
                _build_quiz_bank_batch(t["id"], t["name"], diff, current // QUIZ_BATCH_SIZE)
                time.sleep(8)   # yield Ollama to user requests between batches
                count = database.get_quiz_bank_count(t["id"], diff)
                if count > 0:
                    total += count
                    print(f"[quiz_bank] {t['id']}/{diff}: {count} questions")
            except Exception as e:
                print(f"[quiz_bank] fill error {t['id']}/{diff}: {e}")
    print(f"[quiz_bank] done — {total} questions total")


def generate_quiz(topic_id: str, topic_name: str, difficulty: str = "medium", count: int = 5, variant: int = 0) -> dict:
    """Legacy wrapper — routes through the bank."""
    return get_quiz_from_bank(topic_id, topic_name, difficulty, count)


def evaluate_answer(topic_name: str, question: str, options: list, correct_index: int, user_index: int) -> dict:
    return _claude_json(
        QUIZMASTER_SYSTEM,
        f"Topic: {topic_name}\nQ: {question}\nOptions: {options}\nCorrect index: {correct_index}\nUser index: {user_index}\nReturn evaluation JSON.",
        max_tokens=400,
    )


def get_hint(topic_name: str, question: str, options: list, hint_level: int = 1) -> dict:
    return _claude_json(
        QUIZMASTER_SYSTEM,
        f"Topic: {topic_name}\nQ: {question}\nOptions: {options}\nReturn hint JSON (hint_level={hint_level}).",
        max_tokens=200,
    )


def chat_message(message: str, topic_name: str = None) -> dict:
    context = f"The student is currently studying '{topic_name}'. " if topic_name else ""
    response = _claude_text(
        CHAT_SYSTEM,
        context + message,
        max_tokens=800,
    )
    return {"response": response or "I couldn't generate a response — please try again."}


# ── Background pre-warmer ─────────────────────────────────────────────────────

def prewarm_all():
    """Generates explain+pseudocode+complexity for every uncached topic at startup.

    Uses a thread pool so multiple topics are cached in parallel. Pseudocode is
    prioritised first (slowest call) so the Code tab becomes responsive sooner.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import database

    cached_keys = set(database.cache_keys())
    topics = database.get_all_topics()

    CONTENT_TASKS = [
        ("pseudocode",    lambda tid, tname: get_pseudocode(tid, tname)),
        ("explain",       lambda tid, tname: explain_topic(tid, tname)),
        ("complexity_v2", lambda tid, tname: analyze_complexity(tid, tname)),
    ]

    def _run(item):
        fn, tid, tname, func = item
        try:
            func(tid, tname)
            print(f"[prewarm] {fn}:{tid} ✓")
        except Exception as e:
            print(f"[prewarm] {fn}:{tid} ✗ {e}")

    # Phase 1: content tasks (pseudocode/explain/complexity) — 3 workers
    content_tasks = []
    for fn, func in CONTENT_TASKS:
        for t in topics:
            tid, tname = t["id"], t["name"]
            if f"{fn}:{tid}" not in cached_keys:
                content_tasks.append((fn, tid, tname, func))

    if content_tasks:
        with ThreadPoolExecutor(max_workers=3) as pool:
            for f in as_completed({pool.submit(_run, t): t for t in content_tasks}):
                f.result()

    # Quiz bank is filled by fill_quiz_bank_all(), called from main.py startup
    # after Phase 1 completes so it doesn't compete with content prewarm.
