"""Run locally to pre-generate all topic content and store in Railway's PostgreSQL."""

import os, json, re, time
from concurrent.futures import ThreadPoolExecutor, as_completed

# Requires DATABASE_URL and ANTHROPIC_API_KEY (or GROQ_API_KEY) to be set in the environment before running.

import database
import claude_service

database.init_db()

topics = database.get_all_topics()
cached_keys = set(database.cache_keys())
print(f"Found {len(topics)} topics. Cached keys: {len(cached_keys)}")

TASKS = [
    ("explain",       lambda tid, tname: claude_service.explain_topic(tid, tname)),
    ("pseudocode",    lambda tid, tname: claude_service.get_pseudocode(tid, tname)),
    ("complexity_v2", lambda tid, tname: claude_service.analyze_complexity(tid, tname)),
]

work = []
for fn, func in TASKS:
    for t in topics:
        key = f"{fn}:{t['id']}"
        if key not in cached_keys:
            work.append((fn, t["id"], t["name"], func))

print(f"Need to generate {len(work)} items...\n")

ok = fail = 0

def _run(item):
    fn, tid, tname, func = item
    try:
        result = func(tid, tname)
        if result and len(result) > 1:
            return f"  ✓ {fn}:{tid}"
        else:
            return f"  ✗ {fn}:{tid} — empty result"
    except Exception as e:
        return f"  ✗ {fn}:{tid} — {e}"

with ThreadPoolExecutor(max_workers=4) as pool:
    futures = {pool.submit(_run, item): item for item in work}
    for f in as_completed(futures):
        msg = f.result()
        print(msg)
        if "✓" in msg:
            ok += 1
        else:
            fail += 1

print(f"\nDone. ✓ {ok}  ✗ {fail}")
