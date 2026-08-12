"""One-time backfill: populate topics.tags and topics.companies via Groq.

`companies` is AI-inferred (plausible companies known to ask this kind of
question in general), not sourced from verified interview reports — the
frontend must label it as such.

Requires DATABASE_URL and GROQ_API_KEY to be set in the environment before running.
"""
import os, json, re, time, httpx

GROQ_API_KEY = os.environ["GROQ_API_KEY"]

import database
database.init_db()

SYSTEM = (
    "You are a DSA curriculum tagger. Given a topic name and description, return a JSON object with:\n"
    '  "tags": 3-6 short lowercase kebab-case tags for the underlying technique/pattern '
    '(e.g. "two-pointer", "hashing", "recursion", "greedy", "binary-search") — NOT the topic name itself.\n'
    '  "companies": 3-5 well-known tech companies plausibly known for asking DSA interview questions '
    "involving this kind of topic, based on general public knowledge of interview patterns. "
    "This is a general inference, not a claim about a specific verified question.\n"
    "Return ONLY the JSON object, no markdown fences."
)


def groq_tag(name: str, description: str, retries: int = 4) -> dict:
    for attempt in range(retries):
        try:
            r = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {"role": "system", "content": SYSTEM},
                        {"role": "user", "content": f"Topic: {name}\nDescription: {description}"},
                    ],
                    "max_tokens": 300,
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
                timeout=30,
            )
            if r.status_code == 429:
                time.sleep(15)
                continue
            r.raise_for_status()
            data = json.loads(r.json()["choices"][0]["message"]["content"])
            tags = [t.strip().lower() for t in data.get("tags", []) if t.strip()]
            companies = [c.strip() for c in data.get("companies", []) if c.strip()]
            return {"tags": tags, "companies": companies}
        except Exception:
            if attempt < retries - 1:
                time.sleep(5)
            else:
                return {"tags": [], "companies": []}
    return {"tags": [], "companies": []}


topics = [t for t in database.get_all_topics() if t.get("depth", 1) > 0]
print(f"Backfilling tags/companies for {len(topics)} topics...\n", flush=True)

ok = fail = 0
with database.get_conn() as conn:
    for i, t in enumerate(topics, 1):
        result = groq_tag(t["name"], t.get("description") or "")
        if result["tags"] or result["companies"]:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE topics SET tags = %s, companies = %s WHERE id = %s",
                    (",".join(result["tags"]), ",".join(result["companies"]), t["id"]),
                )
            print(f"[{i}/{len(topics)}] ✓ {t['name']} -> tags={result['tags']} companies={result['companies']}", flush=True)
            ok += 1
        else:
            print(f"[{i}/{len(topics)}] ✗ {t['name']} — empty result", flush=True)
            fail += 1
        time.sleep(0.3)

print(f"\nDone! ✓ {ok}  ✗ {fail}", flush=True)
