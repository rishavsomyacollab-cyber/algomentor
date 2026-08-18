# AlgoMentor

A DSA (Data Structures & Algorithms) learning platform powered by a local LLM. Users can search, explore, and learn any DSA topic with AI-generated explanations, pseudocode, complexity analysis, step-by-step animations, quizzes, and a personalized learning roadmap.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [How Search Works](#how-search-works)
- [How Recommendations Work](#how-recommendations-work)
- [How RAG Works](#how-rag-works)
- [Content Pipeline](#content-pipeline)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
- [Deployment (Production)](#deployment-production)
- [Environment Variables](#environment-variables)

---

## Features

- **73 pre-seeded DSA topics** organized in a 3-level hierarchy (categories → topics → subtopics)
- **AI explanations** with intuition, worked examples, code, and tips (via local LLM)
- **Pseudocode + Python + Java** code for every topic
- **Time/space complexity analysis** with full mathematical derivations
- **Step-by-step animations** for Binary Search, Bubble Sort, Merge Sort
- **MCQ quizzes** at easy/medium/hard difficulty with hints
- **Hybrid search** — SQL exact match + Qdrant semantic/vector search
- **Learning roadmap** — prerequisite graph powered by Neo4j (shortest path between topics)
- **Personalized recommendations** — 6-signal hybrid engine (Neo4j + Qdrant + user activity)
- **RAG-enriched explanations** — each explanation uses relevant chunks from previously explained topics
- **JWT auth** with refresh token rotation, password reset via email (Resend)
- **GFG crawler** — fetches and stores GeeksForGeeks articles for each topic
- **User dashboard** — progress tracking, activity heatmap, bookmarks
- **Personalized Journey panel** — always-visible "what to learn next" powered by the 6-signal recommendation engine
- **Filterable topic browser** — flat, LeetCode-style list with status/difficulty/category/tag/company filters (company tags are AI-inferred, not verified interview data)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend | FastAPI (Python), uvicorn |
| Structured DB | PostgreSQL 16 (psycopg2, connection pool) |
| Graph DB | Neo4j (Cypher, PREREQUISITE/RELATED edges) — optional, degrades gracefully if unavailable |
| Vector DB | Qdrant (local file, cosine similarity, 768-dim) — optional, degrades gracefully if unavailable |
| LLM | Groq (`llama-3.1-8b-instant` / `llama-3.3-70b-versatile`) primary, with Claude API and local Ollama (`qwen2.5:3b`) as fallbacks — see `claude_service.py` |
| Crawler | httpx + BeautifulSoup (GeeksForGeeks) |
| Auth | JWT (access token 15min + refresh token rotation), password reset via Resend |
| Hosting | Render (backend, Docker), Vercel (frontend), Neon (Postgres) — all free tier |

---

## Project Structure

```
algomentor/
├── apps/
│   ├── api/                        # FastAPI backend (port 8000)
│   │   ├── main.py                 # All API routes + startup sequence
│   │   ├── database.py             # PostgreSQL — connection pool, all queries, schema
│   │   ├── auth.py                 # JWT auth — signup, login, refresh, me
│   │   ├── claude_service.py       # Ollama LLM calls, RAG, caching, prompts
│   │   ├── vector_store.py         # Qdrant — embeddings, semantic search, RAG context
│   │   ├── graph_store.py          # Neo4j — topic graph, shortest path, recommendations
│   │   ├── recommendation_engine.py# Hybrid 6-signal recommendation engine
│   │   ├── crawler.py              # GFG crawler (httpx + BeautifulSoup)
│   │   ├── pipeline.py             # Content generation pipeline
│   │   ├── backfill_tags_companies.py # One-time: AI-generate topic tags + company labels via Groq
│   │   ├── agents/
│   │   │   ├── tutor_agent.py      # Explanation + pseudocode + complexity
│   │   │   ├── quiz_agent.py       # Quiz generation, evaluation, hints
│   │   │   └── visualization_agent.py # Step-by-step animation data
│   │   ├── qdrant_db/              # Qdrant local storage
│   │   ├── .env                    # Environment variables
│   │   └── requirements.txt
│   │
│   └── web/                        # Next.js frontend (port 3001)
│       └── src/
│           ├── app/
│           │   ├── page.tsx                # Home — TopicMap + TopicView
│           │   ├── dashboard/page.tsx      # User dashboard
│           │   └── onboarding/page.tsx     # Onboarding flow
│           ├── components/
│           │   ├── TopicMap.tsx            # Search bar + Journey panel + topic list
│           │   ├── JourneyPanel.tsx        # Always-visible personalized "what's next"
│           │   ├── TopicList.tsx           # Flat, filterable/sortable topic browser
│           │   ├── TopicView.tsx           # Tab container (Learn/Code/Quiz/Animate)
│           │   ├── TopicGraph.tsx          # React Flow — prerequisite graph
│           │   ├── ChatBot.tsx             # Floating AI tutor chat
│           │   ├── AnimationPanel.tsx      # Step-by-step visualiser
│           │   ├── QuizPanel.tsx           # MCQ quiz with hints
│           │   ├── CodePanel.tsx           # Pseudocode + Python/Java
│           │   └── ComplexityPanel.tsx     # Complexity table
│           ├── lib/
│           │   ├── api.ts                  # All API calls — single source of truth
│           │   ├── types.ts                # Shared TypeScript interfaces
│           │   └── topicMeta.ts            # Shared category/icon/difficulty-color maps
│           └── store/
│               ├── useTopicStore.ts        # Selected topic, topics list
│               ├── useAuthStore.ts         # User, access token, login/logout
│               └── useActivityStore.ts     # Activity event buffer
│
├── docs/
│   ├── HLD.md                      # High Level Design
│   └── LLD.md                      # Low Level Design (full schema + diagrams)
├── docker-compose.yml              # PostgreSQL + Neo4j services
└── package.json                    # Workspace root
```

---

## Architecture

```
User
 │
 ▼
Next.js Frontend (port 3001)
 │  REST API / Server-Sent Events
 ▼
FastAPI Backend (port 8000)   ← main.py orchestrates everything
 │
 ├──► PostgreSQL  — source of truth (users, topics, progress, content, cache)
 ├──► Neo4j       — graph traversal (prerequisites, roadmap, shortest path)
 ├──► Qdrant      — semantic search (vector embeddings, RAG context)
 └──► Ollama      — local LLM (explanations, quiz, chat, embeddings)
```

### Why three databases?

| Database | Used for | Why not just PostgreSQL? |
|----------|----------|--------------------------|
| PostgreSQL | Users, progress, topics, content, cache | Best for relational structured data |
| Neo4j | Prerequisite graph, shortest path, "what next" | Graph traversal (4+ hops) is slow in SQL |
| Qdrant | Semantic search, similar topics, RAG | Vector cosine search needs a dedicated index |

**The databases never talk directly to each other.** FastAPI reads from all three and merges results. Neo4j and Qdrant are both seeded from PostgreSQL on startup.

---

## Database Design

### PostgreSQL — 13 Tables

```
users               — id (UUID), email, username, password_hash, is_active
topics              — id (TEXT), name, category, difficulty, parent_id, depth, slug,
                      tags, companies (both AI-generated via backfill_tags_companies.py,
                      companies is a heuristic inference, not verified interview data)
topic_content       — topic_id PK, learn_content, complexity_json, animation_json,
                      code_python, code_java, pseudocode, quiz_json
user_progress       — (user_id, topic_id) PK, completed, quiz_best_score, time_spent_sec
user_activity       — id, user_id, topic_id, event_type, event_data (JSONB), created_at
user_sessions       — id, user_id, refresh_token UNIQUE, expires_at, revoked
user_preferences    — user_id PK, experience_level, goal, interested_categories (JSONB)
bookmarks           — (user_id, topic_id) PK, created_at
quiz_history        — id, topic_id, question, user_answer, correct, score
raw_documents       — id, topic_id, source_url, raw_content (crawled GFG text)
document_chunks     — id, topic_id, chunk_index, content (500-word chunks)
ai_cache            — cache_key PK, response (JSON), created_at
password_reset_tokens — id, user_id, token_hash, expires_at, used
```

### Neo4j — Topic Graph

```
Nodes:  Topic { id, name, difficulty, category }
Edges:  PREREQUISITE  — must know A before learning B
        RELATED       — closely related, good to study together

Example:
  (graph_basics)-[:PREREQUISITE]->(bfs)-[:PREREQUISITE]->(dijkstra)
  (bfs)-[:RELATED]->(dfs)
  (merge_sort)-[:RELATED]->(quick_sort)
```

113 edges across 73 topics, all defined in `graph_store.py`.

### Qdrant — Two Collections

```
topics              — one 768-dim vector per topic (name + description + category)
explanation_chunks  — one vector per explanation section (introduction, how_it_works, tips...)
```

Used for semantic search and RAG context injection.

---

## How Search Works

Two endpoints:

### `/api/search/quick` — live search bar (SQL LIKE, ~15ms)
```
User types "binary"
    │
    ▼
SELECT * FROM topics
WHERE name ILIKE '%binary%' OR description ILIKE '%binary%'
    │
    ▼
Returns: Binary Search, Binary Tree, Binary Search Tree
```

### `/api/search` — hybrid search (SQL + Qdrant)
```
User submits "graph traversal level order"
    │
    ├──► PostgreSQL ILIKE  → 0 results (no exact word match)
    │
    └──► Qdrant cosine search
              embed query → 768-dim vector
              compare against all 73 stored topic vectors
              → BFS (0.94), DFS (0.89), Topological Sort (0.81)
    │
    └──► merge + deduplicate (SQL results first, then Qdrant)
    │
    ▼
Returns: BFS (semantic 94%), DFS (semantic 89%)...
```

SQL finds **what you spelled**. Qdrant finds **what you meant**.

---

## How Recommendations Work

`GET /api/recommendations` — 6-signal hybrid engine in `recommendation_engine.py`:

| Signal | Points | Source |
|--------|--------|--------|
| Graph next — prerequisites complete | 40–60 | Neo4j PREREQUISITE edges |
| Bookmark neighbor — next topic | 25 | Neo4j |
| Bookmark neighbor — related topic | 15 | Neo4j |
| Vector similar to recently viewed | 10–30 | Qdrant cosine (decayed by rank) |
| Graph related to recently viewed | 20 | Neo4j RELATED edges |
| Category affinity (best quiz scores) | 15 | PostgreSQL |
| Difficulty progression | 10 | PostgreSQL |

All signals add to a score dict `{ topic_id: total_points }`. Final result is `sorted(scores, reverse=True)[:limit]`.

**Cold start** (< 3 data points): returns beginner topics sorted by difficulty.

This feed powers the always-visible **Journey panel** (`JourneyPanel.tsx`) on the main page — a "Next Up" card plus a short "Then:" chain, rather than a collapsed strip. The flat topic browser below it (`TopicList.tsx`) is a separate, independent view: all topics client-side filtered by status/difficulty/category/tags/company and sorted alphabetically by default.

---

## How RAG Works

Every time a topic explanation is generated for the first time:

```
1. Check PostgreSQL ai_cache → hit? return instantly

2. Get RAG context from Qdrant:
   embed "explain Dijkstra algorithm"
   → search explanation_chunks collection
   → exclude Dijkstra's own chunks
   → return 4 most relevant chunks from other topics
     e.g. [BFS — how_it_works], [Priority Queue — intro], [Graph — introduction]

3. Prepend context to LLM prompt:
   "RELATED CONTEXT: [BFS — how_it_works] BFS explores level by level...
    [Priority Queue] A min-heap gives smallest element in O(log n)...
    Explain Dijkstra in depth."

4. Send to Ollama qwen2.5:3b → rich JSON response

5. Save to PostgreSQL ai_cache (permanent)

6. Index Dijkstra's new explanation chunks into Qdrant
   → future topics can use Dijkstra as RAG context
```

This creates a **snowball effect** — each explanation makes future explanations richer.

---

## Content Pipeline

```
Step 1 — Crawl
  crawler.py fetches GFG article (httpx + BeautifulSoup)
  strips ads, nav, footer → clean text
  saves to raw_documents (PostgreSQL)
  rate limited: 2 seconds between requests

Step 2 — Chunk
  split into 500-word overlapping chunks (50-word overlap)
  save to document_chunks (PostgreSQL)

Step 3 — Embed
  each chunk → Ollama nomic-embed-text → 768-dim vector
  save to Qdrant explanation_chunks collection

Step 4 — Generate (one time only)
  raw_content → Ollama qwen2.5:3b with RAG context
  generates: learn_content, complexity_json, quiz_json,
             code_python, code_java, pseudocode, animation_json
  save to topic_content (PostgreSQL)

Step 5 — Done
  all tabs served from PostgreSQL instantly
  never regenerated unless forced with ?force=true
```

---

## API Endpoints

### Auth (`auth.py`)
```
POST  /api/auth/signup       Create account
POST  /api/auth/login        Login → access + refresh token
POST  /api/auth/logout       Revoke refresh token
POST  /api/auth/refresh      Rotate access token
GET   /api/auth/me           Get current user
```

### Topics
```
GET   /api/topics                    All 73 topics with progress
GET   /api/pseudocode/{topic_id}     Pseudocode + Python + Java
GET   /api/complexity/{topic_id}     Time/space complexity with derivations
POST  /api/explain                   AI explanation (JSON)
GET   /api/stream/explain            Streaming explanation (SSE)
POST  /api/animate                   Step-by-step animation data
POST  /api/topics/create             Create dynamic topic on-the-fly
```

### Quiz & Chat
```
POST  /api/quiz/generate     Generate MCQ quiz
POST  /api/quiz/evaluate     Evaluate answer
POST  /api/quiz/hint         Get hint
POST  /api/chat              Chat with AI tutor
```

### Search & Recommendations
```
GET   /api/search/quick              Fast SQL search (~15ms)
GET   /api/search                    Hybrid SQL + Qdrant search
GET   /api/recommend/{topic_id}      Per-topic recommendations (Qdrant + Neo4j)
GET   /api/recommendations           Personalized feed (all 6 signals)
```

### Graph (Neo4j)
```
GET   /api/graph/topic/{topic_id}    Prerequisites + next + related topics
GET   /api/graph/path?from=X&to=Y    Shortest prerequisite path
GET   /api/graph/category/{cat}      All nodes + edges in a category
GET   /api/graph/recommend           "What to learn next" (auth required)
GET   /api/graph/edges               Full static edge list
GET   /api/graph/status              Is Neo4j connected?
```

### User
```
GET   /api/progress                  Get progress
POST  /api/progress                  Save progress
POST  /api/activity                  Log activity event
GET   /api/bookmarks                 Get bookmarks
POST  /api/bookmarks/{topic_id}      Toggle bookmark
GET   /api/user/stats                Dashboard stats
GET   /api/user/activity             Activity feed
GET   /api/user/preferences          Onboarding preferences
POST  /api/user/preferences          Save preferences
```

### Admin
```
POST  /api/admin/crawl/{topic_id}    Crawl single topic
POST  /api/admin/crawl/all           Crawl all uncrawled topics
POST  /api/admin/generate/{topic_id} Generate content for topic
POST  /api/admin/generate/all        Generate all content
GET   /api/admin/status              Crawl + generation status
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (for PostgreSQL + Neo4j)
- [Ollama](https://ollama.ai) installed and running

### 1. Pull Ollama models

```bash
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

### 2. Start databases

```bash
docker-compose up -d
# starts PostgreSQL on :5432 and Neo4j on :7687/:7474
```

### 3. Backend

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your values
uvicorn main:app --reload --port 8000
```

On first startup the server will:
- Create all PostgreSQL tables
- Seed 73 DSA topics
- Seed Neo4j with topic nodes + 113 edges
- Index all topics into Qdrant
- Pre-warm AI cache in background

### 4. Frontend

```bash
npm install
npm run dev --workspace=apps/web
# opens at http://localhost:3001
```

### 5. (Optional) Crawl + generate content

```bash
# Crawl all topics from GeeksForGeeks
curl -X POST http://localhost:8000/api/admin/crawl/all

# Generate AI content for all crawled topics
curl -X POST http://localhost:8000/api/admin/generate/all

# Check status
curl http://localhost:8000/api/admin/status
```

---

## Deployment (Production)

The live deployment does **not** use `docker-compose.prod.yml` — that self-hosted nginx/VPS setup exists in the repo but has never actually been deployed. The real production stack is three free-tier services wired together directly:

| Service | Role | Notes |
|---------|------|-------|
| [Render](https://render.com) | Backend (`apps/api`, Docker) | Free web service; sleeps after 15 min idle (~30-60s cold start on wake) |
| [Vercel](https://vercel.com) | Frontend (`apps/web`) | **Not git-linked** — deploy manually with `cd apps/web && vercel deploy --prod` after pushing to GitHub |
| [Neon](https://neon.tech) | PostgreSQL | Free tier; compute scales to zero after 5 min idle |

Neo4j and Qdrant are **not** deployed anywhere in production — `graph_store.py` and `vector_store.py` both fail open (see `main.py`'s background init threads), so topic-graph and semantic-search features degrade gracefully instead of crashing the app. The Journey panel and recommendations still work off Postgres-only signals (progress, quiz scores, category affinity).

Required Render environment variables: `DATABASE_URL` (Neon connection string), `JWT_SECRET`, `GROQ_API_KEY`. Optional: `RESEND_API_KEY` (password reset emails), `ANTHROPIC_API_KEY` (upgrades the LLM fallback chain from Groq-only to Claude-first).

Required Vercel environment variable: `API_URL` (the Render backend's public URL) — consumed by the rewrite in `apps/web/next.config.mjs` that proxies `/api/*` to the backend.

## Environment Variables

`apps/api/.env`:

```env
DATABASE_URL=postgresql://algomentor:algomentor@localhost:5432/algomentor
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
EMBED_MODEL=nomic-embed-text
JWT_SECRET=your-secret-key-here
GROQ_API_KEY=your-groq-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
RESEND_API_KEY=your-resend-key-here
```

---

## Startup Sequence

```
FastAPI starts
 │
 ├─1─► database.init_db()
 │       └── CREATE tables IF NOT EXISTS
 │       └── INSERT 73 topics ON CONFLICT DO NOTHING
 │
 ├─2─► Thread: _prewarm()
 │       └── Ping Ollama (warm model in memory)
 │       └── Generate + cache AI responses for all topics
 │       └── Index all topics into Qdrant (runs after prewarm to avoid Ollama contention)
 │
 └─3─► Thread: _init_graph()
         └── Read all topics from PostgreSQL
         └── MERGE 73 Topic nodes into Neo4j
         └── MERGE 113 PREREQUISITE/RELATED edges into Neo4j
```

Neo4j and Qdrant are both **populated from PostgreSQL** — Postgres is always the single source of truth.

---

## Implementation Phases

| Phase | What | Status |
|-------|------|--------|
| 1 | PostgreSQL schema + 73 topics seeded | ✅ Done |
| 2 | JWT auth (bcrypt, refresh token rotation) | ✅ Done |
| 3 | Login / Signup frontend | ✅ Done |
| 4 | Topic hierarchy (depth 0/1/2) | ✅ Done |
| 5 | Crawler (httpx + BeautifulSoup → GFG) | ✅ Done |
| 6 | Content generation pipeline | ✅ Done |
| 7 | Qdrant semantic search + RAG | ✅ Done |
| 8 | Neo4j topic graph + shortest path | ✅ Done |
| 9 | Hybrid recommendation engine | ✅ Done |
| 10 | React Flow graph visualisation | 🔲 In Progress |
| 11 | User dashboard (progress, heatmap) | 🔲 In Progress |
| 12 | Production deployment (Render + Vercel + Neon) | ✅ Done |
| 13 | Always-visible Journey panel + filterable topic browser | ✅ Done |
