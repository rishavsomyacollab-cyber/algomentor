# AlgoMentor — Claude Code Guide

## Project Overview
AlgoMentor is a DSA (Data Structures & Algorithms) learning platform. Users can search, create, and learn any DSA topic with AI-powered explanations, pseudocode, complexity analysis, quizzes, and step-by-step animations.

## Monorepo Structure
```
algomentor/
├── apps/
│   ├── api/          # FastAPI Python backend (port 8000)
│   └── web/          # Next.js 14 TypeScript frontend (port 3001)
├── frontend/         # Legacy — ignore
└── package.json      # Workspace root
```

## Running the Project

**Backend:**
```bash
cd apps/api
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
npm run dev --workspace=apps/web
# OR
cd apps/web && npm run dev
# Runs on http://localhost:3001
```

**Prerequisites:**
- Ollama running locally with `qwen2.5:3b` model pulled
- Python venv at `apps/api/.venv`

## Backend (`apps/api/`)

### Key Files
| File | Purpose |
|------|---------|
| `main.py` | FastAPI routes, startup prewarm, search endpoints |
| `claude_service.py` | Ollama LLM calls, response caching, AI feature logic |
| `database.py` | SQLite operations (topics, progress, AI cache) |
| `vector_store.py` | Qdrant vector DB — semantic search & recommendations |
| `agents/` | Specialized agent modules (tutor, quiz, visualization) |

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/topics` | All topics |
| POST | `/api/topics/create` | Create dynamic topic |
| POST | `/api/explain` | AI explanation |
| GET | `/api/stream/explain` | Streaming explanation (SSE) |
| GET | `/api/pseudocode/{topic_id}` | Code in pseudocode/Python/Java |
| GET | `/api/complexity/{topic_id}` | Time/space complexity analysis |
| POST | `/api/animate` | Step-by-step animation data |
| POST | `/api/quiz/generate` | Generate MCQ quiz |
| POST | `/api/quiz/evaluate` | Evaluate quiz answer |
| POST | `/api/quiz/hint` | Get hint for quiz question |
| GET/POST | `/api/progress` | Get/save user progress |
| POST | `/api/chat` | Chat with DSA tutor |
| GET | `/api/search/quick` | Fast SQL search (~15ms) |
| GET | `/api/search` | Hybrid SQL + vector semantic search |
| GET | `/api/recommend/{topic_id}` | Similar topic recommendations |

### AI / LLM
- Model: `qwen2.5:3b` via Ollama at `http://localhost:11434`
- Config: `OLLAMA_BASE_URL` and `OLLAMA_MODEL` env vars (`.env` file)
- All LLM calls go through `_ollama_json()` or `_ollama_stream()` in `claude_service.py`
- `max_tokens` values: explain=1200, pseudocode=2000, complexity=1600, quiz=2500

### Caching (SQLite `ai_cache` table)
All LLM responses are cached in SQLite to avoid redundant calls.

Cache key format: `{function_name}:{topic_id}`

| Cache key | Content |
|-----------|---------|
| `explain:{id}` | Full explanation JSON |
| `pseudocode:{id}` | Pseudocode + Python + Java |
| `complexity_v2:{id}` | Time/space complexity with derivations |
| `quiz_easy:{id}` | 5-question easy quiz |
| `quiz_medium:{id}` | 5-question medium quiz |
| `quiz_hard:{id}` | 5-question hard quiz |

**Clearing a cache entry:**
```python
import database; database.init_db()
database.cache_set("pseudocode:floyd_warshall", None)
```

### Vector DB (Qdrant)
- Stored at `apps/api/qdrant_db/`
- Embeddings: `nomic-embed-text` via Ollama, 768-dim vectors
- Two collections: `topics` (topic metadata), `explanation_chunks` (RAG context)
- Indexed at startup — runs AFTER `prewarm_all()` to avoid Ollama contention
- String topic IDs mapped to deterministic UUID5s for Qdrant point IDs
- If embeddings seem stale/wrong: delete `qdrant_db/` directory and restart

### LLM Output Quirks (known issues with `qwen2.5:3b`)
`_normalise_pseudocode()` and `_strip_fences()` in `claude_service.py` handle these:
1. **Double-JSON-encoding** — model wraps code in extra quotes: `"\"def foo():\\n...\""`
2. **Literal `\n`** — model writes backslash-n text instead of real newlines
3. **Nested dict** — model returns `python: {"working code": "..."}` instead of a string
4. **Markdown fences** — model wraps code in ` ```python ``` ` blocks

### Animations (Supported vs Not)
Only these topic IDs have real step-by-step simulations:
```python
SUPPORTED_ANIMATIONS = {"binary_search", "bubble_sort", "merge_sort"}
```
All others return `{"simulation_available": False}` — `AnimationPanel.tsx` shows a "not available" screen.

### Startup Sequence
1. `database.init_db()` — creates SQLite tables
2. Background thread: `_prewarm()` — generates all cached AI responses for known topics
3. After prewarm: `_index_vectors()` — indexes all topics into ChromaDB

## Frontend (`apps/web/`)

### Key Files
| File | Purpose |
|------|---------|
| `src/lib/api.ts` | All API calls — single source of truth for backend communication |
| `src/lib/types.ts` | Shared TypeScript interfaces |
| `src/components/TopicMap.tsx` | Topic list, search bar (150ms debounce), create topic |
| `src/components/TopicView.tsx` | Tab container for a topic (explain/code/quiz/animate) |
| `src/components/AnimationPanel.tsx` | Step-by-step animation player |
| `src/components/QuizPanel.tsx` | MCQ quiz with hints and evaluation |
| `src/components/CodePanel.tsx` | Pseudocode + Python/Java syntax highlighting |
| `src/components/ComplexityPanel.tsx` | Time/space complexity display |
| `src/components/ChatBot.tsx` | Floating AI tutor chat |
| `src/store/useTopicStore.ts` | Zustand global state |

### State Management
Global state via Zustand in `useTopicStore.ts`. Tracks: selected topic, topics list, progress map.

### Search
- Uses `api.searchQuick(q)` → `GET /api/search/quick` (SQL LIKE, ~15ms)
- 150ms debounce on keystrokes
- Shows "Create & Learn" button when no match found
- `api.createTopic(name)` auto-infers category and difficulty from the topic name

### Adding a New API Endpoint
1. Add route in `apps/api/main.py`
2. Add TypeScript function in `apps/web/src/lib/api.ts`
3. Add interface to `apps/web/src/lib/types.ts` if needed

## Database (SQLite at `apps/api/algomentor.db`)

Tables:
- `topics` — id, name, category, difficulty, description
- `user_progress` — topic_id, completed, quiz_best_score, last_visited
- `ai_cache` — cache_key, response (JSON), created_at

## Common Tasks

**Add a new topic permanently** (not user-created):
Add to the seed data in `database.py` `init_db()` function.

**Add a new animation** for a topic:
Add the topic ID to `SUPPORTED_ANIMATIONS` in `claude_service.py`, then implement the simulation logic in `get_animation()`.

**Debug LLM output** for a topic:
```bash
curl -s http://localhost:8000/api/pseudocode/<topic_id> | python3 -m json.tool
```

**Check what's cached:**
```python
import database; database.init_db()
keys = database.cache_keys()
print([k for k in keys if 'floyd' in k])
```

**Reset vector index:**
```bash
rm -rf apps/api/qdrant_db/
# Restart the API server — it will re-index on startup
```
