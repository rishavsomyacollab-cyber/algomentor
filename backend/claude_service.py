import json
import re
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")


# ── Cache helpers ────────────────────────────────────────────────────────────

def _cache_get(fn: str, topic_id: str):
    import database
    return database.cache_get(f"{fn}:{topic_id}")


def _cache_set(fn: str, topic_id: str, value: dict):
    import database
    database.cache_set(f"{fn}:{topic_id}", value)


# ── Ollama helpers ────────────────────────────────────────────────────────────

def _ollama_json(system: str, user_msg: str, max_tokens: int = 1200) -> dict:
    """Call Ollama, return parsed JSON. Returns {} on failure."""
    try:
        r = httpx.post(f"{OLLAMA_BASE}/api/chat", json={
            "model": MODEL,
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

PSEUDOCODE_SYSTEM = """You are AlgoMentor's Code Teacher. Be concise.

Return ONLY valid JSON, no markdown fences, no extra text:
{"algorithm":"name","pseudocode":"short pseudocode","python":"working Python code","java":"working Java code","key_lines":{"python":[1,2],"java":[1,2]},"line_notes":{"python":{"1":"note"},"java":{"1":"note"}}}"""

QUIZMASTER_SYSTEM = """You are AlgoMentor's Quizmaster. Be concise.

For questions, return ONLY valid JSON, no markdown fences:
{"questions":[{"id":"q1","question":"question text","options":["A. opt","B. opt","C. opt","D. opt"],"correct_index":0,"explanation":"brief why","difficulty":"medium","topic_aspect":"aspect"}]}

For evaluation, return ONLY:
{"correct":true,"score":80,"feedback":"one sentence feedback","explanation":"brief explanation"}

For hints, return ONLY:
{"hint":"one helpful nudge","hint_level":1}"""

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


def get_animation(topic_id: str, topic_name: str, input_array: list = None, target=None) -> dict:
    arr = input_array or [4, 2, 7, 1, 9, 3, 8, 5]

    if topic_id == "binary_search":
        arr = sorted(arr)
        if target is None:
            target = arr[len(arr) // 2]

    algo_map = {
        "binary_search": lambda: _simulate_binary_search(arr, target),
        "bubble_sort":   lambda: _simulate_bubble_sort(arr),
        "merge_sort":    lambda: _simulate_merge_sort(arr),
    }
    sim_fn = algo_map.get(topic_id) or algo_map["bubble_sort"]
    sim_data = sim_fn()
    steps = _add_descriptions(topic_id, sim_data)
    return {
        "algorithm": topic_name,
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
    result = _ollama_json(
        EXPLAINER_SYSTEM,
        f"Explain the '{topic_name}' algorithm/data structure in depth.",
        max_tokens=2048,
    )
    # Only cache real responses — don't cache empty error results
    if result and result.get("concept"):
        _cache_set("explain", topic_id, result)
    return result


def get_pseudocode(topic_id: str, topic_name: str) -> dict:
    cached = _cache_get("pseudocode", topic_id)
    if cached:
        return cached
    result = _ollama_json(
        PSEUDOCODE_SYSTEM,
        f"Give pseudocode, Python, and Java for '{topic_name}'. Keep implementations short but complete.",
        max_tokens=1600,
    )
    if result:
        _cache_set("pseudocode", topic_id, result)
    return result


def analyze_complexity(topic_id: str, topic_name: str) -> dict:
    cached = _cache_get("complexity_v2", topic_id)
    if cached:
        return cached
    result = _ollama_json(
        COMPLEXITY_SYSTEM,
        f"Analyze time and space complexity of '{topic_name}' with full mathematical derivations.",
        max_tokens=1600,
    )
    if result:
        _cache_set("complexity_v2", topic_id, result)
    return result


def generate_quiz(topic_id: str, topic_name: str, difficulty: str = "medium", count: int = 3) -> dict:
    cached = _cache_get(f"quiz_{difficulty}", topic_id)
    if cached:
        return cached
    result = _ollama_json(
        QUIZMASTER_SYSTEM,
        f"Generate {count} MCQ questions about '{topic_name}' at '{difficulty}' difficulty.",
        max_tokens=1200,
    )
    if result:
        _cache_set(f"quiz_{difficulty}", topic_id, result)
    return result


def evaluate_answer(topic_name: str, question: str, options: list, correct_index: int, user_index: int) -> dict:
    return _ollama_json(
        QUIZMASTER_SYSTEM,
        f"Topic: {topic_name}\nQ: {question}\nOptions: {options}\nCorrect index: {correct_index}\nUser index: {user_index}\nReturn evaluation JSON.",
        max_tokens=400,
    )


def get_hint(topic_name: str, question: str, options: list, hint_level: int = 1) -> dict:
    return _ollama_json(
        QUIZMASTER_SYSTEM,
        f"Topic: {topic_name}\nQ: {question}\nOptions: {options}\nReturn hint JSON (hint_level={hint_level}).",
        max_tokens=200,
    )


def chat_message(message: str, topic_name: str = None) -> dict:
    context = f"The student is currently studying '{topic_name}'. " if topic_name else ""
    response = _ollama_text(
        CHAT_SYSTEM,
        context + message,
        max_tokens=800,
    )
    return {"response": response or "I couldn't generate a response — please try again."}


# ── Background pre-warmer ─────────────────────────────────────────────────────

def prewarm_all():
    """Generates explain+pseudocode+complexity for every uncached topic at startup."""
    import database
    cached_keys = database.cache_keys()
    topics = database.get_all_topics()

    for t in topics:
        tid, tname = t["id"], t["name"]
        for fn, func in [
            ("explain",       lambda tid=tid, tname=tname: explain_topic(tid, tname)),
            ("pseudocode",    lambda tid=tid, tname=tname: get_pseudocode(tid, tname)),
            ("complexity_v2", lambda tid=tid, tname=tname: analyze_complexity(tid, tname)),
            ("quiz_easy",     lambda tid=tid, tname=tname: generate_quiz(tid, tname, "easy", 5)),
            ("quiz_medium",   lambda tid=tid, tname=tname: generate_quiz(tid, tname, "medium", 5)),
            ("quiz_hard",     lambda tid=tid, tname=tname: generate_quiz(tid, tname, "hard", 5)),
        ]:
            if f"{fn}:{tid}" not in cached_keys:
                try:
                    func()
                    print(f"[prewarm] {fn}:{tid} ✓")
                except Exception as e:
                    print(f"[prewarm] {fn}:{tid} ✗ {e}")
