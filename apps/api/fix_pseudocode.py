"""Regenerate bad pseudocode entries using Groq, with robust JSON extraction."""
import os, time, httpx, json, re

# Requires DATABASE_URL and GROQ_API_KEY to be set in the environment before running.
GROQ_API_KEY = os.environ["GROQ_API_KEY"]

import database
database.init_db()

cs = open(os.path.join(os.path.dirname(__file__), "claude_service.py")).read()
PSEUDO_SYSTEM = re.search(r'PSEUDOCODE_SYSTEM = """(.*?)"""', cs, re.DOTALL).group(1).strip()

topics = database.get_all_topics()
bad = [(t["id"], t["name"]) for t in topics
       if not (lambda d: d and d.get("pseudocode") and d.get("python"))(
           database.cache_get(f'pseudocode:{t["id"]}'))]

print(f"Regenerating {len(bad)} bad pseudocode entries...\n", flush=True)


def _extract_code_from_keys(raw: dict, lang: str) -> str:
    """If code ended up as a JSON key instead of a value, find and return it."""
    val = raw.get(lang, "")
    if val and len(val) > 20:
        return val
    # scan keys for code-like strings for this language
    for key in raw.keys():
        if lang == "python" and ("def " in key or "class " in key) and len(key) > 30:
            return key
        if lang == "java" and ("public " in key or "class " in key) and len(key) > 30:
            return key
        if lang == "pseudocode" and len(key) > 30 and key[0].isdigit():
            return key
    return val


def groq_pseudocode(topic_name, retries=6):
    for attempt in range(retries):
        try:
            r = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": PSEUDO_SYSTEM},
                        {"role": "user", "content": f"Write pseudocode, Python, and Java for '{topic_name}'."}
                    ],
                    "max_tokens": 2048,
                    "temperature": 0.1,
                    "response_format": {"type": "json_object"},
                },
                timeout=60,
            )
            if r.status_code == 429:
                print(f"  rate limit, waiting 20s...", flush=True)
                time.sleep(20)
                continue
            r.raise_for_status()
            raw = json.loads(r.json()["choices"][0]["message"]["content"])

            # Reconstruct if code ended up as keys
            result = {
                "algorithm": raw.get("algorithm", topic_name),
                "pseudocode": _extract_code_from_keys(raw, "pseudocode"),
                "python":     _extract_code_from_keys(raw, "python"),
                "java":       _extract_code_from_keys(raw, "java"),
                "key_lines":  raw.get("key_lines", {}),
                "line_notes": raw.get("line_notes", {}),
            }
            return result
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(10)
            else:
                return {}
    return {}


ok = fail = 0
for i, (tid, tname) in enumerate(bad, 1):
    result = groq_pseudocode(tname)
    if result and (result.get("pseudocode") or result.get("python")):
        database.cache_set(f"pseudocode:{tid}", result)
        print(f"[{i}/{len(bad)}] ✓ {tname}", flush=True)
        ok += 1
    else:
        print(f"[{i}/{len(bad)}] ✗ {tname}", flush=True)
        fail += 1
    time.sleep(1)

print(f"\nDone! ✓ {ok}  ✗ {fail}", flush=True)
