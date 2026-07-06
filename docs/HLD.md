# AlgoMentor — High Level Design (HLD)

---

## System Architecture

```
                 ┌──────────────────┐
                 │     Frontend     │
                 │  Next.js 14      │
                 │  React Flow      │
                 └────────┬─────────┘
                          │
                     REST / SSE
                          │
                          ▼

               ┌────────────────────┐
               │  AlgoMentor API    │
               │  FastAPI (Python)  │
               └────────┬───────────┘
                        │

     ┌──────────────────┼──────────────────┐
     ▼                  ▼                  ▼

┌──────────┐     ┌───────────┐     ┌───────────┐
│PostgreSQL│     │   Neo4j   │     │  Qdrant   │
│ Metadata │     │   Topic   │     │Embeddings │
│ & Users  │     │   Graph   │     │  (RAG)    │
└──────────┘     └───────────┘     └───────────┘

                        ▲
                        │

               ┌────────────────┐
               │     Ollama     │
               │  llama3        │
               │  qwen3         │
               │  nomic-embed   │
               └────────────────┘

                        ▲
                        │

               ┌────────────────┐
               │    Crawler     │
               │  Crawl4AI /    │
               │  Firecrawl     │
               └────────────────┘
```

---

## Why 3 Databases?

### PostgreSQL
Stores all structured data — users, topics, quizzes, progress, code examples.

Tables:
```
users          topics         topic_content
quizzes        code_examples  user_progress
animations     raw_documents  document_chunks
```

Example topic row:
```json
{
  "topic_id": 1,
  "title": "Arrays",
  "difficulty": "Beginner",
  "parent_topic": null
}
```

---

### Neo4j — Most Important
Stores topic relationships as a graph. This is the core of AlgoMentor.

```
Arrays
   │
   ▼
Sliding Window
   │
   ▼
Two Pointers
   │
   ▼
Binary Search
```

Graph relationships:
```
(Arrays)-[:PREREQUISITE]->(SlidingWindow)
(SlidingWindow)-[:PREREQUISITE]->(TwoPointers)
(TwoPointers)-[:RELATED]->(BinarySearch)
(BinarySearch)-[:RELATED]->(BinarySearchTree)
(Arrays)-[:RELATED]->(HashMap)
```

Benefits:
- Learning roadmap generation
- Topic recommendations
- Prerequisite dependency tracking
- "What to learn next" queries

Cypher query for recommendations:
```cypher
MATCH (u:User {id: $userId})-[:COMPLETED]->(t:Topic)
MATCH (t)-[:PREREQUISITE]->(next:Topic)
WHERE NOT (u)-[:COMPLETED]->(next)
RETURN next.name, count(*) as relevance
ORDER BY relevance DESC
LIMIT 5
```

---

### Qdrant
Stores vector embeddings of all topic content for semantic search and RAG.

Example — Arrays topic gets broken into chunks:
```
Chunk 1: "Array Introduction — contiguous memory..."
Chunk 2: "Array Operations — insert, delete, search..."
Chunk 3: "Array Problems — two sum, max subarray..."
Chunk 4: "Array Complexity — O(1) access, O(n) search..."
```

Each chunk → embedded via Ollama:
```
[0.45, 0.12, 0.89, 0.33, 0.71, ...]   (768-dim vector)
```

When user asks "Explain Sliding Window":
- Query embedded → Qdrant finds nearest chunks
- Relevant content injected into Ollama prompt (RAG)
- Answer grounded in real content, not hallucinated

---

## Topic Structure

Every topic node in Neo4j and PostgreSQL:
```json
{
  "id": "arrays",
  "name": "Arrays",
  "difficulty": "Beginner",
  "parent_id": null,
  "depth": 0
}
```

DSA inside DSA — full hierarchy:
```
Arrays (category)
 ├── Array Basics (topic)
 ├── Two Pointers (topic)
 │     └── Dutch National Flag (subtopic)
 ├── Sliding Window (topic)
 │     └── Variable Window (subtopic)
 └── Prefix Sum (topic)

Graphs (category)
 ├── BFS (topic)
 ├── DFS (topic)
 ├── Dijkstra (topic)
 │     └── Modified Dijkstra (subtopic)
 └── Floyd-Warshall (topic)
```

---

## Topic Page Structure

When user clicks a topic (e.g. Arrays):

```
Arrays
 ├── Learn        ← Markdown explanation stored in PostgreSQL
 ├── Animation    ← JSON steps stored in PostgreSQL
 ├── Complexity   ← JSON table stored in PostgreSQL
 ├── Quiz         ← MCQ questions stored in PostgreSQL
 └── Code         ← Python/Java code stored in PostgreSQL
```

### Learn Tab
Stored as markdown in `topic_content.learn_content`:
```markdown
# Arrays

An array is a contiguous block of memory storing elements
of the same type. Access is O(1) by index.

## Key Operations
- Access: O(1)
- Search: O(n)
- Insert at end: O(1) amortized
- Insert at middle: O(n)
```

### Complexity Tab
Stored as JSON in `topic_content.complexity_json`:
```json
{
  "access":    "O(1)",
  "search":    "O(n)",
  "insert":    "O(n)",
  "delete":    "O(n)",
  "space":     "O(n)",
  "notes": "Access is O(1) due to direct index calculation"
}
```

### Code Tab
Stored in `code_examples` table:
```java
public class ArrayExample {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        System.out.println(arr[2]); // O(1) access
    }
}
```

### Quiz Tab
Stored in `quizzes` table:
```json
{
  "question": "What is the time complexity of array access by index?",
  "option_a": "O(1)",
  "option_b": "O(n)",
  "option_c": "O(log n)",
  "option_d": "O(n²)",
  "answer": "A"
}
```

### Animation Tab
Stored as JSON in `topic_content.animation_json`:
```json
{
  "steps": [
    { "step": 1, "label": "Create array [5, 2, 8, 1]", "highlight": [] },
    { "step": 2, "label": "Access index 2", "highlight": [2] },
    { "step": 3, "label": "Return value: 8", "highlight": [2], "result": 8 }
  ]
}
```

---

## Crawling Architecture

### Step 1 — Fetch Raw Content
```
Crawler targets:
  ├── GeeksForGeeks
  ├── Wikipedia (DSA articles)
  ├── Java Docs
  └── CP Algorithms

Tool: Crawl4AI (async, JS-rendered pages)
  or: Firecrawl (managed, cleaner output)
```

### Step 2 — Store Raw
```
Raw HTML / Markdown → raw_documents table

raw_documents
├── id
├── topic_id
├── source_url
├── raw_content    ← full scraped text
└── crawled_at
```

### Step 3 — Chunking
```
Raw content split into overlapping chunks:
  Chunk size:    500 tokens
  Overlap:       50 tokens

Stored in document_chunks:
├── id
├── topic_id
├── chunk_index
├── content       ← chunk text
└── embedding_id  ← Qdrant point ID
```

### Step 4 — Embed via Ollama
```bash
ollama run nomic-embed-text
```
Each chunk → 768-dim vector → stored in Qdrant.

---

## Content Generation Pipeline

```
Raw Crawled Content
        ↓
    Ollama (llama3 8B)
        ↓
   Generate once:
   ├── Learn tab (markdown)
   ├── Complexity table (JSON)
   ├── Quiz questions (10 MCQs)
   ├── Code examples (Python + Java)
   └── Animation steps (JSON)
        ↓
  Store permanently in PostgreSQL
        ↓
   Never generate again ← cached forever
```

Example generation prompt:
```
You are an expert DSA teacher. Given this content about Arrays:
{raw_content}

Generate the following as JSON:
1. learn_content: detailed markdown explanation
2. complexity_json: time/space complexity table
3. quiz: 10 MCQ questions with 4 options and answer
4. code_python: working Python implementation
5. code_java: working Java implementation
6. animation_json: step-by-step animation data
```

**Rule: Generate ONCE, store permanently. Never re-generate on user request.**

---

## Learning Recommendation Flow

```
User completed:
  ✓ Arrays
  ✓ HashMap
  ✓ Stack

Neo4j query:
MATCH (u:User {id: $uid})-[:COMPLETED]->(t:Topic)
MATCH (t)-[:PREREQUISITE|RELATED]->(next:Topic)
WHERE NOT (u)-[:COMPLETED]->(next)
RETURN next.name, count(*) AS score
ORDER BY score DESC
LIMIT 5

Returns:
  → Sliding Window    (prerequisite of Arrays)
  → Queue             (related to Stack)
  → Heap              (related to HashMap + Stack)
```

Combined with Qdrant similarity on recently viewed topics for hybrid recommendations.

---

## Ollama Setup (Local)

```
Ollama
 ├── llama3:8b          ← main generation (learn, quiz, code)
 ├── qwen2.5:3b         ← fast generation (hints, chat)
 └── nomic-embed-text   ← embeddings for Qdrant
```

Model responsibilities:
| Model | Task | Speed |
|-------|------|-------|
| `llama3:8b` | Learn tab, code, full quiz | Slow, high quality |
| `qwen2.5:3b` | Chat tutor, hints, quick answers | Fast |
| `nomic-embed-text` | Vectorise content for Qdrant | Very fast |

---

## Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 + TypeScript | SSR, App Router |
| Graph viz | React Flow | DSA tree visualisation |
| API | FastAPI (Python) | Async, fast, auto docs |
| Auth | JWT + bcrypt | Stateless, secure |
| Primary DB | PostgreSQL | Structured data, reliable |
| Graph DB | Neo4j | Topic relationships, recommendations |
| Vector DB | Qdrant | Semantic search, RAG |
| LLM | Ollama + llama3 | Fully local, no API cost |
| Embeddings | nomic-embed-text | 768-dim, high quality |
| Crawler | Crawl4AI / Firecrawl | JS-rendered pages, clean output |

---

## If Building AlgoMentor Today

**Backend**
- Python 3.13 + FastAPI
- Pydantic v2 for validation

**Databases**
- PostgreSQL — all structured data (users, topics, quizzes, progress)
- Neo4j — topic graph (prerequisites, relationships, recommendations)
- Qdrant — vector embeddings (semantic search, RAG)

**AI**
- Ollama + llama3:8b (generation)
- Ollama + nomic-embed-text (embeddings)
- qwen2.5:3b (fast responses)

**Crawling**
- Crawl4AI (async, handles JS pages)

**Frontend**
- Next.js 14
- React Flow (topic graph visualisation)
- Framer Motion (animations)

> Use Neo4j as the source of truth for topic relationships,
> PostgreSQL for all learning content and user data,
> and Qdrant only for semantic search and RAG.
> This is the cleanest, most scalable architecture for AlgoMentor.
