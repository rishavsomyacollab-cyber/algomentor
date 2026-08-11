"""Generate missing explain entries using Groq llama-3.1-8b-instant (high rate limits)."""
import os, sys, time, httpx, json, re

# Requires DATABASE_URL and GROQ_API_KEY to be set in the environment before running.
GROQ_API_KEY = os.environ["GROQ_API_KEY"]

import database
database.init_db()

topics = database.get_all_topics()
keys = set(database.cache_keys())
missing = [t for t in topics if f'explain:{t["id"]}' not in keys]
print(f"Generating {len(missing)} missing explains via Groq 8b-instant...\n", flush=True)

SYSTEM = open(os.path.join(os.path.dirname(__file__), "claude_service.py")).read()
# Extract EXPLAINER_SYSTEM from claude_service
m = re.search(r'EXPLAINER_SYSTEM = """(.*?)"""', SYSTEM, re.DOTALL)
EXPLAINER_SYSTEM = m.group(1).strip() if m else ""

def groq_explain(topic_name):
    r = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": EXPLAINER_SYSTEM},
                {"role": "user", "content": f"Explain the '{topic_name}' algorithm/data structure in depth."}
            ],
            "max_tokens": 2048,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
        },
        timeout=60,
    )
    r.raise_for_status()
    text = r.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(text)
    except:
        return {}

ok = fail = 0
for i, t in enumerate(missing, 1):
    try:
        result = groq_explain(t["name"])
        if result and result.get("concept"):
            database.cache_set(f'explain:{t["id"]}', result)
            print(f"[{i}/{len(missing)}] ✓ {t['name']}", flush=True)
            ok += 1
        else:
            print(f"[{i}/{len(missing)}] ✗ {t['name']} — empty", flush=True)
            fail += 1
    except Exception as e:
        if "rate_limit" in str(e).lower() or "429" in str(e):
            print(f"[{i}/{len(missing)}] rate limit hit, waiting 10s...", flush=True)
            time.sleep(10)
            i -= 1
            missing.insert(i, t)
            continue
        print(f"[{i}/{len(missing)}] ✗ {t['name']} — {e}", flush=True)
        fail += 1
    time.sleep(0.5)

print(f"\nDone! ✓ {ok}  ✗ {fail}", flush=True)
