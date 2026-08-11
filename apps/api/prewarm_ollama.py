"""Generate missing explain+complexity using local Ollama → store in Railway PostgreSQL."""

import os, json, re, sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# Requires DATABASE_URL and GROQ_API_KEY to be set in the environment before running.
# Use Groq (free cloud) as primary, Ollama as fallback
os.environ.pop("ANTHROPIC_API_KEY", None)
os.environ.setdefault("OLLAMA_MODEL", "qwen2.5:3b")
os.environ.setdefault("OLLAMA_BASE_URL", "http://localhost:11434")

import database
import claude_service

database.init_db()
topics = database.get_all_topics()
keys = set(database.cache_keys())

TASKS = [
    ("explain",       lambda tid, tname: claude_service.explain_topic(tid, tname)),
    ("complexity_v2", lambda tid, tname: claude_service.analyze_complexity(tid, tname)),
]

work = []
for fn, func in TASKS:
    for t in topics:
        if f"{fn}:{t['id']}" not in keys:
            work.append((fn, t["id"], t["name"], func))

total = len(work)
print(f"Generating {total} missing items using qwen2.5:7b...\n")

ok = fail = 0

def _run(item):
    fn, tid, tname, func = item
    try:
        result = func(tid, tname)
        if result and len(result) > 1:
            return f"  ✓ {fn}: {tname}"
        else:
            return f"  ✗ {fn}: {tname} — empty"
    except Exception as e:
        return f"  ✗ {fn}: {tname} — {e}"

with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(_run, item): item for item in work}
    done = 0
    for f in as_completed(futures):
        msg = f.result()
        done += 1
        if "✓" in msg:
            ok += 1
        else:
            fail += 1
        print(f"[{done}/{total}] {msg}")

print(f"\nDone! ✓ {ok} generated  ✗ {fail} failed")
