# AlgoMentor — Low Level Design (LLD)

---

## Database Design

### PostgreSQL — All Tables

---

#### `users`
```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url    TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    last_active   TIMESTAMP,
    is_active     BOOLEAN DEFAULT TRUE
);
```

---

#### `topics`
```sql
CREATE TABLE topics (
    id          TEXT PRIMARY KEY,        -- e.g. "arrays", "sliding_window"
    name        TEXT NOT NULL,
    difficulty  TEXT DEFAULT 'Beginner', -- Beginner / Intermediate / Advanced
    category    TEXT NOT NULL,           -- "arrays", "graphs", "dp"
    parent_id   TEXT REFERENCES topics(id),
    depth       INT DEFAULT 1,           -- 0=category, 1=topic, 2=subtopic
    gfg_url     TEXT,
    is_crawled  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

Example rows:
```
id               name               difficulty   parent_id
------------------------------------------------------------
arrays           Arrays             Beginner     NULL
sliding_window   Sliding Window     Intermediate arrays
two_pointers     Two Pointers       Intermediate arrays
binary_search    Binary Search      Beginner     arrays
graphs           Graphs             Intermediate NULL
bfs              BFS                Intermediate graphs
dijkstra         Dijkstra           Advanced     graphs
```

---

#### `topic_content`
One row per topic. All AI-generated, stored permanently after first generation.

```sql
CREATE TABLE topic_content (
    topic_id        TEXT PRIMARY KEY REFERENCES topics(id),
    learn_content   TEXT,        -- Markdown explanation
    complexity_json JSONB,       -- Time/space complexity table
    animation_json  JSONB,       -- Step-by-step animation data
    generated_at    TIMESTAMP DEFAULT NOW(),
    last_updated    TIMESTAMP DEFAULT NOW()
);
```

`learn_content` example (markdown):
```markdown
# Arrays

An array is a collection of elements stored in **contiguous memory**.
Each element is accessible in **O(1)** time using its index.

## How It Works
1. Memory allocated as a block
2. Index maps to address: `base_addr + (index × element_size)`
3. Direct access — no traversal needed

## Key Insight
Arrays trade flexibility (fixed size) for speed (O(1) access).
```

`complexity_json` example:
```json
{
  "access":      { "value": "O(1)",  "note": "Direct index calculation" },
  "search":      { "value": "O(n)",  "note": "Linear scan required" },
  "insert_end":  { "value": "O(1)",  "note": "Amortized for dynamic arrays" },
  "insert_mid":  { "value": "O(n)",  "note": "Shift elements right" },
  "delete":      { "value": "O(n)",  "note": "Shift elements left" },
  "space":       { "value": "O(n)",  "note": "n elements stored" }
}
```

`animation_json` example:
```json
{
  "algorithm": "Array Access",
  "steps": [
    { "step": 1, "label": "Array: [5, 2, 8, 1, 9]",  "highlight": [],  "pointer": null },
    { "step": 2, "label": "Access index 2",            "highlight": [2], "pointer": 2   },
    { "step": 3, "label": "Return arr[2] = 8",         "highlight": [2], "result": 8    }
  ]
}
```

---

#### `code_examples`
```sql
CREATE TABLE code_examples (
    id        SERIAL PRIMARY KEY,
    topic_id  TEXT REFERENCES topics(id),
    language  TEXT NOT NULL,   -- 'python', 'java', 'cpp'
    code      TEXT NOT NULL,
    notes     TEXT
);
```

Python example:
```python
# Arrays in Python
arr = [5, 2, 8, 1, 9]

# O(1) access
print(arr[2])      # 8

# O(n) search
def linear_search(arr, target):
    for i, val in enumerate(arr):
        if val == target:
            return i
    return -1
```

Java example:
```java
public class ArrayExample {
    public static void main(String[] args) {
        int[] arr = {5, 2, 8, 1, 9};

        // O(1) access
        System.out.println(arr[2]);  // 8

        // O(n) search
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] == 8) System.out.println("Found at: " + i);
        }
    }
}
```

---

#### `quizzes`
```sql
CREATE TABLE quizzes (
    id         SERIAL PRIMARY KEY,
    topic_id   TEXT REFERENCES topics(id),
    question   TEXT NOT NULL,
    option_a   TEXT NOT NULL,
    option_b   TEXT NOT NULL,
    option_c   TEXT NOT NULL,
    option_d   TEXT NOT NULL,
    answer     CHAR(1) NOT NULL,   -- 'A', 'B', 'C', or 'D'
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium'
);
```

Example row:
```json
{
  "topic_id":    "arrays",
  "question":    "What is the time complexity of accessing an array element by index?",
  "option_a":    "O(1)",
  "option_b":    "O(n)",
  "option_c":    "O(log n)",
  "option_d":    "O(n²)",
  "answer":      "A",
  "explanation": "Arrays store elements in contiguous memory. Index directly maps to a memory address, so access is always O(1) regardless of array size."
}
```

---

#### `user_progress`
```sql
CREATE TABLE user_progress (
    user_id         UUID REFERENCES users(id),
    topic_id        TEXT REFERENCES topics(id),
    completed       BOOLEAN DEFAULT FALSE,
    quiz_best_score INT DEFAULT 0,
    quiz_attempts   INT DEFAULT 0,
    time_spent_sec  INT DEFAULT 0,
    last_visited    TIMESTAMP,
    PRIMARY KEY (user_id, topic_id)
);
```

---

#### `user_activity`
Event log powering recommendations and analytics.

```sql
CREATE TABLE user_activity (
    id          SERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    topic_id    TEXT REFERENCES topics(id),
    event_type  TEXT NOT NULL,
    -- event_type values:
    --   'view'           user opened topic
    --   'quiz_start'     started a quiz
    --   'quiz_complete'  finished quiz (score in event_data)
    --   'search'         searched for a topic
    --   'bookmark'       bookmarked a topic
    event_data  JSONB,
    created_at  TIMESTAMP DEFAULT NOW()
);
```

Example events:
```json
{ "event_type": "view",          "topic_id": "arrays" }
{ "event_type": "quiz_complete", "topic_id": "arrays", "event_data": { "score": 80 } }
{ "event_type": "search",        "event_data": { "query": "sliding window" } }
```

---

#### `bookmarks`
```sql
CREATE TABLE bookmarks (
    user_id    UUID REFERENCES users(id),
    topic_id   TEXT REFERENCES topics(id),
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);
```

---

#### `raw_documents`
Stores crawled content before processing.

```sql
CREATE TABLE raw_documents (
    id          SERIAL PRIMARY KEY,
    topic_id    TEXT REFERENCES topics(id),
    source_url  TEXT NOT NULL,
    raw_content TEXT NOT NULL,    -- full scraped text / markdown
    crawled_at  TIMESTAMP DEFAULT NOW()
);
```

---

#### `document_chunks`
Content split into chunks for embedding.

```sql
CREATE TABLE document_chunks (
    id           SERIAL PRIMARY KEY,
    topic_id     TEXT REFERENCES topics(id),
    chunk_index  INT NOT NULL,
    content      TEXT NOT NULL,
    qdrant_id    TEXT,           -- Qdrant point ID for this vector
    created_at   TIMESTAMP DEFAULT NOW()
);
```

---

## Neo4j — Graph Schema

### Node: `Topic`
```cypher
CREATE (:Topic {
  id:         "arrays",
  name:       "Arrays",
  difficulty: "Beginner",
  category:   "arrays"
})
```

### Node: `User`
```cypher
CREATE (:User {
  id:       "uuid-here",
  username: "somya"
})
```

### Relationships
```cypher
-- Topic A is required before Topic B
(arrays)-[:PREREQUISITE]->(sliding_window)
(sliding_window)-[:PREREQUISITE]->(two_pointers)
(two_pointers)-[:RELATED]->(binary_search)
(arrays)-[:RELATED]->(hash_map)
(binary_search)-[:PREREQUISITE]->(binary_search_tree)

-- User completed a topic
(user)-[:COMPLETED { score: 90, at: datetime() }]->(arrays)

-- User bookmarked a topic
(user)-[:BOOKMARKED]->(sliding_window)
```

### Full Topic Graph (73 topics)
```
Arrays ──PREREQUISITE──► Sliding Window ──PREREQUISITE──► Two Pointers
  │                                                             │
  └──PREREQUISITE──► Prefix Sum                           RELATED
                                                               │
                                                               ▼
Binary Search ◄──PREREQUISITE── Binary Search Tree
      │
      └──PREREQUISITE──► Merge Sort ──PREREQUISITE──► Quick Sort

Stack ──RELATED──► Queue ──RELATED──► Deque
  │
  └──PREREQUISITE──► Monotonic Stack

BFS ──RELATED──► DFS ──RELATED──► Topological Sort
 │
 └──PREREQUISITE──► Dijkstra ──PREREQUISITE──► Bellman-Ford
                                      │
                                      └──RELATED──► Floyd-Warshall

DP: Fibonacci ──PREREQUISITE──► 0/1 Knapsack ──PREREQUISITE──► LCS
                                      │
                                      └──PREREQUISITE──► Edit Distance
```

### Recommendation Query
```cypher
-- "What should I learn next?"
MATCH (u:User {id: $userId})-[:COMPLETED]->(done:Topic)
MATCH (done)-[:PREREQUISITE|RELATED]->(next:Topic)
WHERE NOT (u)-[:COMPLETED]->(next)
  AND NOT (u)-[:SKIPPED]->(next)
WITH next, count(*) AS relevance
ORDER BY relevance DESC
LIMIT 5
RETURN next.id, next.name, next.difficulty, relevance
```

---

## Qdrant — Vector Schema

### Collection: `topic_chunks`
```python
client.create_collection(
    collection_name="topic_chunks",
    vectors_config=VectorParams(
        size=768,          # nomic-embed-text output dim
        distance=Distance.COSINE,
    ),
)
```

### Point structure
```json
{
  "id":     "arrays_chunk_0",
  "vector": [0.45, 0.12, 0.89, ...],
  "payload": {
    "topic_id":    "arrays",
    "topic_name":  "Arrays",
    "chunk_index": 0,
    "content":     "Array is a contiguous memory block..."
  }
}
```

### Search query
```python
results = client.search(
    collection_name="topic_chunks",
    query_vector=embed("explain sliding window"),
    limit=4,
    query_filter=Filter(
        must=[FieldCondition(key="topic_id", match=MatchValue(value="sliding_window"))]
    ),
)
# Returns most relevant chunks → injected into Ollama prompt
```

---

## API Endpoints

### Auth
```
POST   /api/auth/signup         Create account
POST   /api/auth/login          Login
POST   /api/auth/logout         Logout (revoke refresh token)
POST   /api/auth/refresh        Rotate access token
GET    /api/auth/me             Get current user
```

### Topics
```
GET    /api/topics              All topics (flat list)
GET    /api/topics/tree         Full hierarchy tree
GET    /api/topics/{id}         Single topic metadata
POST   /api/topics/create       Create dynamic topic
GET    /api/topics/{id}/content Explanation, quiz, code, complexity, animation
```

### Learning
```
GET    /api/pseudocode/{id}     Code tab content
GET    /api/complexity/{id}     Complexity tab content
POST   /api/animate             Animation tab content
POST   /api/quiz/generate       Generate quiz
POST   /api/quiz/evaluate       Evaluate answer
POST   /api/quiz/hint           Get hint
POST   /api/chat                Tutor chat
GET    /api/stream/explain      Streaming explanation (SSE)
```

### Search & Recommendations
```
GET    /api/search/quick        Fast SQL search (~15ms)
GET    /api/search              Semantic search via Qdrant
GET    /api/recommend/{id}      Topic recommendations (Neo4j + Qdrant hybrid)
```

### User Data
```
GET    /api/progress            Get progress (user-specific if logged in)
POST   /api/progress            Save progress
POST   /api/activity            Log activity event
GET    /api/bookmarks           Get bookmarks
POST   /api/bookmarks/{id}      Toggle bookmark
```

---

## Content Generation Pipeline

```
Step 1: Crawler
        └── Crawl4AI fetches GFG article for "Arrays"
        └── Stores in raw_documents

Step 2: Chunking
        └── Split into 500-token chunks with 50-token overlap
        └── Store in document_chunks

Step 3: Embedding
        └── ollama run nomic-embed-text on each chunk
        └── Store 768-dim vector in Qdrant

Step 4: Generation (ONE TIME)
        └── Send raw_content to llama3:8b
        └── Prompt: "Generate learn tab + complexity + quiz + code + animation"
        └── Parse JSON response
        └── Store in topic_content, code_examples, quizzes tables

Step 5: Done
        └── Never regenerate unless manually triggered
        └── All tabs served from PostgreSQL instantly
```

---

## Frontend Component Tree

```
app/
├── (auth)/
│   ├── login/page.tsx          LoginPage
│   └── signup/page.tsx         SignupPage
│
├── page.tsx                    Home (TopicMap + TopicView)
│
└── dashboard/page.tsx          UserDashboard

components/
├── TopicMap.tsx                Topic grid + search + hierarchy
├── TopicView.tsx               Tab container
│   ├── LearnTab.tsx            Markdown renderer
│   ├── CodePanel.tsx           Python + Java with syntax highlight
│   ├── ComplexityPanel.tsx     Complexity table
│   ├── QuizPanel.tsx           MCQ with hints
│   └── AnimationPanel.tsx      Step-by-step visualiser
│
├── TopicGraph.tsx              React Flow — DSA prerequisite graph
├── RecommendationStrip.tsx     "What to learn next" from Neo4j
├── ChatBot.tsx                 Floating tutor chat
│
└── auth/
    └── AuthGuard.tsx           Redirect if not logged in

store/
├── useTopicStore.ts            Selected topic, topics list
├── useAuthStore.ts             User, access token, login/logout
└── useActivityStore.ts         Buffer activity events before flush
```

---

## Implementation Order

| Phase | What | Status |
|-------|------|--------|
| 1 | DB schema (PostgreSQL tables) | ✅ Done |
| 2 | Auth backend (JWT) | ✅ Done |
| 3 | Login / Signup pages | ✅ Done |
| 4 | Seed 73 topics + hierarchy | ✅ Done |
| 5 | Crawler (Crawl4AI + GFG) | 🔲 Next |
| 6 | Content generation pipeline (llama3) | 🔲 Next |
| 7 | Qdrant integration (replace ChromaDB) | 🔲 Next |
| 8 | Neo4j integration (topic graph) | 🔲 Next |
| 9 | Recommendation engine (Neo4j + Qdrant) | 🔲 Next |
| 10 | Topic graph visualisation (React Flow) | 🔲 Next |
| 11 | User dashboard (progress, bookmarks) | 🔲 Next |
