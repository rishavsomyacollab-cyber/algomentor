import os
import uuid
import json
import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from datetime import date, timedelta

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://algomentor:algomentor@localhost:5432/algomentor",
)

_pool: ThreadedConnectionPool | None = None


def _get_pool() -> ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = ThreadedConnectionPool(2, 20, DATABASE_URL)
    return _pool


@contextmanager
def get_conn():
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        pool.putconn(conn)


# ── Query helpers ─────────────────────────────────────────────────────────────

def _run(conn, sql: str, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params)


def _one(conn, sql: str, params=None) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return dict(row) if row else None


def _all(conn, sql: str, params=None) -> list:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def _scalar(conn, sql: str, params=None):
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
        return row[0] if row else None


# ── Seed data: 73 DSA topics ──────────────────────────────────────────────────
SEED_TOPICS = [
    # Categories (depth=0)
    ("cat_arrays",    "Arrays & Strings",       "arrays",              "Core array and string manipulation techniques",          "beginner",     None, 0),
    ("cat_sorting",   "Sorting Algorithms",      "sorting",             "Algorithms for ordering elements efficiently",           "beginner",     None, 0),
    ("cat_linked",    "Linked Lists",            "data_structures",     "Linear data structures with pointer-based nodes",        "beginner",     None, 0),
    ("cat_stacks",    "Stacks & Queues",         "data_structures",     "LIFO and FIFO abstract data types",                     "beginner",     None, 0),
    ("cat_trees",     "Trees",                   "data_structures",     "Hierarchical data structures and tree algorithms",       "intermediate", None, 0),
    ("cat_graphs",    "Graphs",                  "graphs",              "Network-based structures and traversal algorithms",      "intermediate", None, 0),
    ("cat_dp",        "Dynamic Programming",     "dynamic_programming", "Optimization via memoization and tabulation",            "intermediate", None, 0),
    ("cat_greedy",    "Greedy Algorithms",       "greedy",              "Locally optimal choices for global solutions",           "intermediate", None, 0),
    ("cat_backtrack", "Backtracking",            "backtracking",        "Exhaustive search with pruning strategies",              "advanced",     None, 0),
    ("cat_hashing",   "Hashing",                 "data_structures",     "Hash-based data structures and techniques",              "beginner",     None, 0),
    ("cat_advanced",  "Advanced Topics",         "advanced",            "Advanced data structures and algorithms",                "advanced",     None, 0),
    # Arrays & Strings
    ("two_pointers",       "Two Pointers",              "arrays",              "Use two indices to solve array problems in O(n)",            "beginner",     "cat_arrays",    1),
    ("sliding_window",     "Sliding Window",             "arrays",              "Fixed/variable window technique for subarrays",              "intermediate", "cat_arrays",    1),
    ("prefix_sum",         "Prefix Sum",                 "arrays",              "Precompute cumulative sums for O(1) range queries",          "beginner",     "cat_arrays",    1),
    ("kadane",             "Kadane's Algorithm",         "arrays",              "Maximum subarray sum in O(n) using DP",                      "intermediate", "cat_arrays",    1),
    ("binary_search",      "Binary Search",              "searching",           "Find element in sorted array in O(log n)",                   "beginner",     "cat_arrays",    1),
    ("kmp_algorithm",      "KMP String Matching",        "arrays",              "Pattern matching in O(n+m) using failure function",          "advanced",     "cat_arrays",    1),
    # Sorting
    ("bubble_sort",        "Bubble Sort",                "sorting",             "Simple O(n²) comparison-based sorting",                      "beginner",     "cat_sorting",   1),
    ("selection_sort",     "Selection Sort",             "sorting",             "O(n²) sort: select minimum element each pass",               "beginner",     "cat_sorting",   1),
    ("insertion_sort",     "Insertion Sort",             "sorting",             "O(n²) sort: build sorted array incrementally",               "beginner",     "cat_sorting",   1),
    ("merge_sort",         "Merge Sort",                 "sorting",             "Divide-and-conquer O(n log n) stable sorting",               "intermediate", "cat_sorting",   1),
    ("quick_sort",         "Quick Sort",                 "sorting",             "In-place divide-and-conquer O(n log n) sort",                "intermediate", "cat_sorting",   1),
    ("heap_sort",          "Heap Sort",                  "sorting",             "O(n log n) sort using a max-heap",                           "intermediate", "cat_sorting",   1),
    ("counting_sort",      "Counting Sort",              "sorting",             "O(n+k) non-comparison integer sort",                         "intermediate", "cat_sorting",   1),
    ("radix_sort",         "Radix Sort",                 "sorting",             "O(nk) digit-by-digit integer sort",                          "intermediate", "cat_sorting",   1),
    # Linked Lists
    ("linked_list",        "Singly Linked List",         "data_structures",     "Linear list with unidirectional next pointers",              "beginner",     "cat_linked",    1),
    ("doubly_linked_list", "Doubly Linked List",         "data_structures",     "Linear list with prev and next pointers",                    "beginner",     "cat_linked",    1),
    ("floyds_cycle",       "Floyd's Cycle Detection",    "data_structures",     "Detect cycles using slow and fast pointers",                 "intermediate", "cat_linked",    1),
    ("reverse_ll",         "Reverse Linked List",        "data_structures",     "Reverse a linked list iteratively and recursively",          "beginner",     "cat_linked",    1),
    # Stacks & Queues
    ("stack_queue",        "Stack & Queue",              "data_structures",     "LIFO stack and FIFO queue operations",                       "beginner",     "cat_stacks",    1),
    ("monotonic_stack",    "Monotonic Stack",            "data_structures",     "Stack maintaining sorted order for next/prev greater",       "intermediate", "cat_stacks",    1),
    ("priority_queue",     "Priority Queue / Heap",      "data_structures",     "Min/max heap for O(log n) priority operations",              "intermediate", "cat_stacks",    1),
    ("deque",              "Deque",                      "data_structures",     "Double-ended queue with O(1) front and back ops",            "beginner",     "cat_stacks",    1),
    # Trees
    ("binary_tree",        "Binary Tree",                "data_structures",     "Tree with at most two children, all traversals",             "intermediate", "cat_trees",     1),
    ("binary_search_tree", "Binary Search Tree",         "data_structures",     "BST with O(log n) average search, insert, delete",           "intermediate", "cat_trees",     1),
    ("avl_tree",           "AVL Tree",                   "data_structures",     "Self-balancing BST maintaining height difference <= 1",      "advanced",     "cat_trees",     1),
    ("segment_tree",       "Segment Tree",               "data_structures",     "Range queries and point updates in O(log n)",                 "advanced",     "cat_trees",     1),
    ("fenwick_tree",       "Fenwick Tree (BIT)",         "data_structures",     "Compact structure for prefix sum queries in O(log n)",        "advanced",     "cat_trees",     1),
    ("trie",               "Trie",                       "data_structures",     "Prefix tree for O(m) string search and insert",              "intermediate", "cat_trees",     1),
    # Graphs
    ("graph_basics",       "Graph Representations",      "graphs",              "Adjacency list vs matrix, directed vs undirected",            "beginner",     "cat_graphs",    1),
    ("bfs",                "BFS",                        "graphs",              "Level-by-level traversal using a queue",                     "intermediate", "cat_graphs",    1),
    ("dfs",                "DFS",                        "graphs",              "Explore as deep as possible using recursion/stack",          "intermediate", "cat_graphs",    1),
    ("dijkstra",           "Dijkstra's Algorithm",       "graphs",              "Single-source shortest path for non-negative weights",       "intermediate", "cat_graphs",    1),
    ("bellman_ford",       "Bellman-Ford Algorithm",     "graphs",              "Shortest path handling negative weights in O(VE)",           "advanced",     "cat_graphs",    1),
    ("floyd_warshall",     "Floyd-Warshall Algorithm",   "graphs",              "All-pairs shortest path in O(V^3)",                          "advanced",     "cat_graphs",    1),
    ("kruskals_mst",       "Kruskal's MST",              "graphs",              "Minimum spanning tree via sorted edges and Union-Find",      "advanced",     "cat_graphs",    1),
    ("topological_sort",   "Topological Sort",           "graphs",              "Linear ordering of a directed acyclic graph",                "intermediate", "cat_graphs",    1),
    ("union_find",         "Union-Find / DSU",           "graphs",              "Disjoint set union for O(alpha) connectivity queries",       "intermediate", "cat_graphs",    1),
    # Dynamic Programming
    ("fibonacci_dp",       "Fibonacci (DP)",             "dynamic_programming", "Memoization and tabulation fundamentals",                    "beginner",     "cat_dp",        1),
    ("knapsack",           "0/1 Knapsack",               "dynamic_programming", "Maximize value under weight constraint",                     "intermediate", "cat_dp",        1),
    ("lcs",                "Longest Common Subsequence", "dynamic_programming", "Find LCS via 2D DP table",                                   "intermediate", "cat_dp",        1),
    ("lis",                "Longest Increasing Subsequence", "dynamic_programming", "LIS in O(n log n) with patience sorting",                "intermediate", "cat_dp",        1),
    ("edit_distance",      "Edit Distance",              "dynamic_programming", "Levenshtein distance between two strings",                   "intermediate", "cat_dp",        1),
    ("coin_change",        "Coin Change",                "dynamic_programming", "Minimum coins to reach target amount",                       "intermediate", "cat_dp",        1),
    ("matrix_chain",       "Matrix Chain Multiplication","dynamic_programming", "Optimal parenthesization via interval DP",                   "advanced",     "cat_dp",        1),
    ("bitmask_dp",         "Bitmask DP",                 "dynamic_programming", "DP over subsets using bit manipulation",                     "advanced",     "cat_dp",        1),
    # Greedy
    ("activity_selection", "Activity Selection",         "greedy",              "Select maximum non-overlapping intervals",                   "intermediate", "cat_greedy",    1),
    ("huffman_coding",     "Huffman Coding",             "greedy",              "Optimal prefix-free encoding using a min-heap",              "advanced",     "cat_greedy",    1),
    ("fractional_knapsack","Fractional Knapsack",        "greedy",              "Maximize value allowing fractional item selection",          "beginner",     "cat_greedy",    1),
    # Backtracking
    ("n_queens",           "N-Queens Problem",           "backtracking",        "Place N queens with no row/column/diagonal conflicts",       "advanced",     "cat_backtrack", 1),
    ("sudoku_solver",      "Sudoku Solver",              "backtracking",        "Fill 9x9 grid satisfying all Sudoku constraints",            "advanced",     "cat_backtrack", 1),
    ("word_search",        "Word Search",                "backtracking",        "Find a word in a 2D character grid via DFS",                 "intermediate", "cat_backtrack", 1),
    # Hashing
    ("hash_map",           "Hash Map",                   "data_structures",     "Key-value store with O(1) average operations",               "beginner",     "cat_hashing",   1),
    ("rolling_hash",       "Rolling Hash",               "data_structures",     "Sliding window hash for efficient string matching",          "advanced",     "cat_hashing",   1),
    # Advanced
    ("sparse_table",       "Sparse Table",               "advanced",            "O(1) range minimum query after O(n log n) build",            "advanced",     "cat_advanced",  1),
    ("heavy_light",        "Heavy-Light Decomposition",  "advanced",            "Tree decomposition for O(log^2 n) path queries",             "advanced",     "cat_advanced",  1),
    ("convex_hull",        "Convex Hull",                "advanced",            "Smallest convex polygon enclosing all given points",         "advanced",     "cat_advanced",  1),
]


# ── Schema ────────────────────────────────────────────────────────────────────

def init_db():
    with get_conn() as conn:
        _run(conn, """
            CREATE TABLE IF NOT EXISTS topics (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                category    TEXT NOT NULL,
                description TEXT,
                difficulty  TEXT DEFAULT 'beginner',
                parent_id   TEXT,
                depth       INTEGER DEFAULT 1,
                slug        TEXT,
                tags        TEXT,
                gfg_url     TEXT,
                gfg_content TEXT,
                is_crawled  SMALLINT DEFAULT 0,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS progress (
                topic_id       TEXT PRIMARY KEY,
                completed      SMALLINT DEFAULT 0,
                quiz_best_score INTEGER DEFAULT 0,
                attempts       INTEGER DEFAULT 0,
                last_visited   TIMESTAMPTZ
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS quiz_history (
                id          BIGSERIAL PRIMARY KEY,
                topic_id    TEXT NOT NULL,
                question    TEXT NOT NULL,
                user_answer TEXT,
                correct     SMALLINT DEFAULT 0,
                score       INTEGER DEFAULT 0,
                timestamp   TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS ai_cache (
                cache_key  TEXT PRIMARY KEY,
                response   TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS users (
                id            TEXT PRIMARY KEY,
                email         TEXT UNIQUE NOT NULL,
                username      TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                avatar_url    TEXT,
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                last_active   TIMESTAMPTZ,
                is_active     SMALLINT DEFAULT 1
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id            TEXT PRIMARY KEY,
                user_id       TEXT NOT NULL,
                refresh_token TEXT UNIQUE NOT NULL,
                expires_at    TIMESTAMPTZ NOT NULL,
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                revoked       SMALLINT DEFAULT 0
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id         TEXT PRIMARY KEY,
                user_id    TEXT NOT NULL,
                token_hash TEXT UNIQUE NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used       SMALLINT DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS user_progress (
                user_id         TEXT NOT NULL,
                topic_id        TEXT NOT NULL,
                completed       SMALLINT DEFAULT 0,
                quiz_best_score INTEGER DEFAULT 0,
                quiz_attempts   INTEGER DEFAULT 0,
                time_spent_sec  INTEGER DEFAULT 0,
                last_visited    TIMESTAMPTZ,
                PRIMARY KEY (user_id, topic_id)
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS user_activity (
                id         BIGSERIAL PRIMARY KEY,
                user_id    TEXT NOT NULL,
                topic_id   TEXT,
                event_type TEXT NOT NULL,
                event_data TEXT,
                session_id TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS bookmarks (
                user_id    TEXT NOT NULL,
                topic_id   TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                PRIMARY KEY (user_id, topic_id)
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS raw_documents (
                id          BIGSERIAL PRIMARY KEY,
                topic_id    TEXT NOT NULL,
                source_url  TEXT NOT NULL,
                raw_content TEXT NOT NULL,
                crawled_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS document_chunks (
                id          BIGSERIAL PRIMARY KEY,
                topic_id    TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                content     TEXT NOT NULL,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS topic_content (
                topic_id        TEXT PRIMARY KEY,
                learn_content   TEXT,
                complexity_json TEXT,
                animation_json  TEXT,
                code_python     TEXT,
                code_java       TEXT,
                pseudocode      TEXT,
                quiz_json       TEXT,
                generated_at    TIMESTAMPTZ DEFAULT NOW(),
                last_updated    TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, """
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id               TEXT PRIMARY KEY,
                experience_level      TEXT,
                goal                  TEXT,
                interested_categories JSONB DEFAULT '[]',
                weekly_hours          TEXT,
                onboarding_completed  SMALLINT DEFAULT 0,
                created_at            TIMESTAMPTZ DEFAULT NOW(),
                updated_at            TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        _run(conn, """
            CREATE TABLE IF NOT EXISTS feedback (
                id         BIGSERIAL PRIMARY KEY,
                name       TEXT,
                email      TEXT,
                rating     SMALLINT CHECK (rating BETWEEN 1 AND 5),
                category   TEXT,
                message    TEXT NOT NULL,
                topic_id   TEXT,
                user_id    TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)

        _run(conn, """
            CREATE TABLE IF NOT EXISTS quiz_bank (
                id          BIGSERIAL PRIMARY KEY,
                topic_id    TEXT NOT NULL,
                difficulty  TEXT NOT NULL,
                question    TEXT NOT NULL,
                options     JSONB NOT NULL,
                correct_index INTEGER NOT NULL,
                explanation TEXT,
                type        TEXT DEFAULT 'concept',
                created_at  TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        _run(conn, "CREATE INDEX IF NOT EXISTS idx_quiz_bank_topic_diff ON quiz_bank(topic_id, difficulty)")

        # Indexes
        for sql in [
            "CREATE INDEX IF NOT EXISTS idx_feedback_created    ON feedback(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_topics_parent      ON topics(parent_id)",
            "CREATE INDEX IF NOT EXISTS idx_topics_category    ON topics(category)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user      ON user_sessions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_activity_user      ON user_activity(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_activity_topic     ON user_activity(topic_id)",
            "CREATE INDEX IF NOT EXISTS idx_activity_created   ON user_activity(created_at)",
        ]:
            _run(conn, sql)

        # Seed topics
        for row in SEED_TOPICS:
            topic_id, name, category, description, difficulty, parent_id, depth = row
            slug = topic_id.replace("_", "-")
            _run(conn, """
                INSERT INTO topics (id, name, category, description, difficulty, parent_id, depth, slug)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO NOTHING
            """, (topic_id, name, category, description, difficulty, parent_id, depth, slug))


# ── Topic queries ─────────────────────────────────────────────────────────────

def get_all_topics(user_id: str = None):
    with get_conn() as conn:
        topics = _all(conn, "SELECT * FROM topics WHERE depth > 0 ORDER BY depth, category, difficulty")
        if user_id:
            progress = _all(conn, "SELECT * FROM user_progress WHERE user_id = %s", (user_id,))
        else:
            progress = _all(conn, "SELECT * FROM progress")
        prog_map = {r["topic_id"]: r for r in progress}
        for t in topics:
            t["progress"] = prog_map.get(
                t["id"], {"completed": 0, "quiz_best_score": 0, "attempts": 0}
            )
        return topics


def get_topic(topic_id: str):
    with get_conn() as conn:
        return _one(conn, "SELECT * FROM topics WHERE id = %s", (topic_id,))


def get_topics_by_category(category: str) -> list:
    with get_conn() as conn:
        return _all(conn,
            "SELECT * FROM topics WHERE category = %s AND depth > 0 ORDER BY difficulty",
            (category,))


def create_or_get_topic(topic_id: str, name: str, category: str = "general",
                        description: str = "", difficulty: str = "intermediate") -> dict:
    with get_conn() as conn:
        existing = _one(conn, "SELECT * FROM topics WHERE id = %s", (topic_id,))
        if existing:
            return existing
        desc = description or f"Learn {name} — a DSA concept"
        slug = topic_id.replace("_", "-")
        _run(conn,
            "INSERT INTO topics (id, name, category, description, difficulty, depth, slug) VALUES (%s,%s,%s,%s,%s,1,%s)",
            (topic_id, name, category, desc, difficulty, slug))
        return {"id": topic_id, "name": name, "category": category,
                "description": desc, "difficulty": difficulty, "depth": 1, "slug": slug}


def search_topics_by_name(query: str, limit: int = 6) -> list:
    with get_conn() as conn:
        like = f"%{query}%"
        return _all(conn,
            "SELECT * FROM topics WHERE (name ILIKE %s OR description ILIKE %s) AND depth > 0 LIMIT %s",
            (like, like, limit))


# ── Anonymous progress ────────────────────────────────────────────────────────

def get_progress():
    with get_conn() as conn:
        rows = _all(conn, "SELECT * FROM progress")
        return {r["topic_id"]: r for r in rows}


def save_progress(topic_id: str, completed: bool = False, quiz_score: int = None):
    with get_conn() as conn:
        existing = _one(conn, "SELECT * FROM progress WHERE topic_id = %s", (topic_id,))
        if existing:
            updates = ["attempts = attempts + 1", "last_visited = NOW()"]
            params: list = []
            if completed:
                updates.append("completed = 1")
            if quiz_score is not None:
                updates.append("quiz_best_score = GREATEST(quiz_best_score, %s)")
                params.append(quiz_score)
            params.append(topic_id)
            _run(conn, f"UPDATE progress SET {', '.join(updates)} WHERE topic_id = %s", params)
        else:
            _run(conn,
                "INSERT INTO progress (topic_id, completed, quiz_best_score, attempts, last_visited) VALUES (%s,%s,%s,1,NOW())",
                (topic_id, 1 if completed else 0, quiz_score or 0))


def save_quiz_attempt(topic_id: str, question: str, user_answer: str, correct: bool, score: int):
    with get_conn() as conn:
        _run(conn,
            "INSERT INTO quiz_history (topic_id, question, user_answer, correct, score) VALUES (%s,%s,%s,%s,%s)",
            (topic_id, question, user_answer, 1 if correct else 0, score))


# ── User auth ─────────────────────────────────────────────────────────────────

def create_user(email: str, username: str, password_hash: str) -> dict:
    user_id = str(uuid.uuid4())
    with get_conn() as conn:
        _run(conn,
            "INSERT INTO users (id, email, username, password_hash) VALUES (%s,%s,%s,%s)",
            (user_id, email.lower().strip(), username.strip(), password_hash))
    return {"id": user_id, "email": email, "username": username}


def get_user_by_email(email: str) -> dict | None:
    with get_conn() as conn:
        return _one(conn,
            "SELECT * FROM users WHERE email = %s AND is_active = 1",
            (email.lower().strip(),))


def get_user_by_id(user_id: str) -> dict | None:
    with get_conn() as conn:
        return _one(conn,
            "SELECT id, email, username, avatar_url, created_at, last_active FROM users WHERE id = %s AND is_active = 1",
            (user_id,))


def update_last_active(user_id: str):
    with get_conn() as conn:
        _run(conn, "UPDATE users SET last_active = NOW() WHERE id = %s", (user_id,))


def update_user_password(user_id: str, new_hash: str):
    with get_conn() as conn:
        _run(conn, "UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))


# ── Password reset tokens ─────────────────────────────────────────────────────

def create_reset_token(user_id: str, token_hash: str, expires_at: str):
    token_id = str(uuid.uuid4())
    with get_conn() as conn:
        _run(conn,
            "UPDATE password_reset_tokens SET used = 1 WHERE user_id = %s AND used = 0",
            (user_id,))
        _run(conn,
            "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (%s,%s,%s,%s)",
            (token_id, user_id, token_hash, expires_at))
    return token_id


def get_reset_token(token_hash: str) -> dict | None:
    with get_conn() as conn:
        return _one(conn,
            "SELECT * FROM password_reset_tokens WHERE token_hash = %s AND used = 0",
            (token_hash,))


def mark_reset_token_used(token_id: str):
    with get_conn() as conn:
        _run(conn, "UPDATE password_reset_tokens SET used = 1 WHERE id = %s", (token_id,))


# ── Sessions (refresh tokens) ─────────────────────────────────────────────────

def create_session(user_id: str, refresh_token_hash: str, expires_at: str) -> str:
    session_id = str(uuid.uuid4())
    with get_conn() as conn:
        _run(conn,
            "INSERT INTO user_sessions (id, user_id, refresh_token, expires_at) VALUES (%s,%s,%s,%s)",
            (session_id, user_id, refresh_token_hash, expires_at))
    return session_id


def get_session_by_token(refresh_token_hash: str) -> dict | None:
    with get_conn() as conn:
        return _one(conn,
            "SELECT * FROM user_sessions WHERE refresh_token = %s AND revoked = 0 AND expires_at > NOW()",
            (refresh_token_hash,))


def revoke_session(session_id: str):
    with get_conn() as conn:
        _run(conn, "UPDATE user_sessions SET revoked = 1 WHERE id = %s", (session_id,))


def revoke_all_user_sessions(user_id: str):
    with get_conn() as conn:
        _run(conn, "UPDATE user_sessions SET revoked = 1 WHERE user_id = %s", (user_id,))


# ── Per-user progress ─────────────────────────────────────────────────────────

def get_user_progress(user_id: str) -> dict:
    with get_conn() as conn:
        rows = _all(conn, "SELECT * FROM user_progress WHERE user_id = %s", (user_id,))
        return {r["topic_id"]: r for r in rows}


def save_user_progress(user_id: str, topic_id: str, completed: bool = False,
                       quiz_score: int = None, time_delta: int = 0):
    with get_conn() as conn:
        existing = _one(conn,
            "SELECT * FROM user_progress WHERE user_id = %s AND topic_id = %s",
            (user_id, topic_id))
        if existing:
            updates = ["quiz_attempts = quiz_attempts + 1",
                       "last_visited = NOW()",
                       "time_spent_sec = time_spent_sec + %s"]
            params: list = [time_delta]
            if completed:
                updates.append("completed = 1")
            if quiz_score is not None:
                updates.append("quiz_best_score = GREATEST(quiz_best_score, %s)")
                params.append(quiz_score)
            params += [user_id, topic_id]
            _run(conn,
                f"UPDATE user_progress SET {', '.join(updates)} WHERE user_id = %s AND topic_id = %s",
                params)
        else:
            _run(conn, """
                INSERT INTO user_progress
                   (user_id, topic_id, completed, quiz_best_score, quiz_attempts, time_spent_sec, last_visited)
                   VALUES (%s,%s,%s,%s,1,%s,NOW())
            """, (user_id, topic_id, 1 if completed else 0, quiz_score or 0, time_delta))


# ── Activity tracking ─────────────────────────────────────────────────────────

def log_activity(user_id: str, event_type: str, topic_id: str = None,
                 event_data: str = None, session_id: str = None):
    with get_conn() as conn:
        _run(conn,
            "INSERT INTO user_activity (user_id, topic_id, event_type, event_data, session_id) VALUES (%s,%s,%s,%s,%s)",
            (user_id, topic_id, event_type, event_data, session_id))


def get_user_activity(user_id: str, limit: int = 50) -> list:
    with get_conn() as conn:
        return _all(conn,
            "SELECT * FROM user_activity WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
            (user_id, limit))


def get_top_categories_by_score(user_id: str) -> list:
    with get_conn() as conn:
        rows = _all(conn, """
            SELECT t.category, AVG(up.quiz_best_score) AS avg_score
            FROM user_progress up
            JOIN topics t ON up.topic_id = t.id
            WHERE up.user_id = %s AND up.quiz_best_score > 0
            GROUP BY t.category
            ORDER BY avg_score DESC
            LIMIT 3
        """, (user_id,))
        return [r["category"] for r in rows]


# ── Bookmarks ─────────────────────────────────────────────────────────────────

def toggle_bookmark(user_id: str, topic_id: str) -> bool:
    with get_conn() as conn:
        existing = _one(conn,
            "SELECT 1 FROM bookmarks WHERE user_id = %s AND topic_id = %s",
            (user_id, topic_id))
        if existing:
            _run(conn, "DELETE FROM bookmarks WHERE user_id = %s AND topic_id = %s",
                 (user_id, topic_id))
            return False
        else:
            _run(conn, "INSERT INTO bookmarks (user_id, topic_id) VALUES (%s,%s)",
                 (user_id, topic_id))
            return True


def get_bookmarks(user_id: str) -> list:
    with get_conn() as conn:
        return _all(conn, """
            SELECT t.* FROM topics t
            JOIN bookmarks b ON t.id = b.topic_id
            WHERE b.user_id = %s
            ORDER BY b.created_at DESC
        """, (user_id,))


# ── User stats & dashboard ────────────────────────────────────────────────────

def get_user_stats(user_id: str) -> dict:
    with get_conn() as conn:
        progress_rows = _all(conn, """
            SELECT up.*, t.category FROM user_progress up
            JOIN topics t ON up.topic_id = t.id
            WHERE up.user_id = %s
        """, (user_id,))

        total_completed = sum(1 for r in progress_rows if r["completed"])
        attempted       = [r for r in progress_rows if r["quiz_best_score"] > 0]
        avg_quiz_score  = (sum(r["quiz_best_score"] for r in attempted) / len(attempted)) if attempted else 0
        total_time_sec  = sum(r["time_spent_sec"] or 0 for r in progress_rows)

        cat_map: dict = {}
        for r in progress_rows:
            cat = r["category"]
            if cat not in cat_map:
                cat_map[cat] = {"category": cat, "total": 0, "completed": 0, "scores": []}
            cat_map[cat]["total"] += 1
            if r["completed"]:
                cat_map[cat]["completed"] += 1
            if r["quiz_best_score"] > 0:
                cat_map[cat]["scores"].append(r["quiz_best_score"])

        topic_counts = _all(conn,
            "SELECT category, COUNT(*) AS n FROM topics WHERE depth = 1 GROUP BY category")
        for row in topic_counts:
            if row["category"] not in cat_map:
                cat_map[row["category"]] = {"category": row["category"], "total": 0, "completed": 0, "scores": []}
            cat_map[row["category"]]["total"] = row["n"]

        categories = []
        for c in cat_map.values():
            scores = c.pop("scores")
            c["avg_score"] = round(sum(scores) / len(scores), 1) if scores else 0
            categories.append(c)
        categories.sort(key=lambda x: x["completed"], reverse=True)

        since = (date.today() - timedelta(days=364)).isoformat()
        activity_rows = _all(conn, """
            SELECT DATE(created_at) AS d, COUNT(*) AS n
            FROM user_activity
            WHERE user_id = %s AND created_at >= %s
            GROUP BY DATE(created_at)
        """, (user_id, since))
        heatmap = {str(r["d"]): r["n"] for r in activity_rows}

        active_dates = set(heatmap.keys())
        streak = 0
        cursor = date.today()
        while cursor.isoformat() in active_dates:
            streak += 1
            cursor -= timedelta(days=1)

    return {
        "total_completed": total_completed,
        "avg_quiz_score":  round(avg_quiz_score, 1),
        "total_time_sec":  total_time_sec,
        "streak_days":     streak,
        "categories":      categories,
        "heatmap":         heatmap,
    }


def get_user_activity_feed(user_id: str, limit: int = 30) -> list:
    with get_conn() as conn:
        return _all(conn, """
            SELECT ua.*, t.name AS topic_name, t.category
            FROM user_activity ua
            LEFT JOIN topics t ON ua.topic_id = t.id
            WHERE ua.user_id = %s
            ORDER BY ua.created_at DESC
            LIMIT %s
        """, (user_id, limit))


# ── User preferences / onboarding ────────────────────────────────────────────

def save_user_preferences(user_id: str, experience_level: str, goal: str,
                          interested_categories: list, weekly_hours: str):
    with get_conn() as conn:
        _run(conn, """
            INSERT INTO user_preferences
               (user_id, experience_level, goal, interested_categories, weekly_hours, onboarding_completed, updated_at)
               VALUES (%s,%s,%s,%s,%s,1,NOW())
            ON CONFLICT (user_id) DO UPDATE SET
               experience_level      = EXCLUDED.experience_level,
               goal                  = EXCLUDED.goal,
               interested_categories = EXCLUDED.interested_categories,
               weekly_hours          = EXCLUDED.weekly_hours,
               onboarding_completed  = 1,
               updated_at            = NOW()
        """, (user_id, experience_level, goal,
              json.dumps(interested_categories), weekly_hours))


def get_user_preferences(user_id: str) -> dict | None:
    with get_conn() as conn:
        row = _one(conn, "SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
        if not row:
            return None
        if isinstance(row.get("interested_categories"), str):
            try:
                row["interested_categories"] = json.loads(row["interested_categories"])
            except Exception:
                row["interested_categories"] = []
        return row


# ── AI cache ──────────────────────────────────────────────────────────────────

def cache_get(key: str):
    with get_conn() as conn:
        row = _one(conn, "SELECT response FROM ai_cache WHERE cache_key = %s", (key,))
        return json.loads(row["response"]) if row else None


def cache_set(key: str, value):
    with get_conn() as conn:
        if value is None:
            _run(conn, "DELETE FROM ai_cache WHERE cache_key = %s", (key,))
            return
        _run(conn, """
            INSERT INTO ai_cache (cache_key, response)
            VALUES (%s,%s)
            ON CONFLICT (cache_key) DO UPDATE SET response = EXCLUDED.response, created_at = NOW()
        """, (key, json.dumps(value)))


def cache_keys():
    with get_conn() as conn:
        rows = _all(conn, "SELECT cache_key FROM ai_cache")
        return {r["cache_key"] for r in rows}


# ── Raw documents (crawler output) ───────────────────────────────────────────

def save_raw_document(topic_id: str, source_url: str, raw_content: str):
    with get_conn() as conn:
        _run(conn, "DELETE FROM raw_documents WHERE topic_id = %s", (topic_id,))
        _run(conn,
            "INSERT INTO raw_documents (topic_id, source_url, raw_content) VALUES (%s,%s,%s)",
            (topic_id, source_url, raw_content))
        _run(conn,
            "UPDATE topics SET is_crawled = 1, gfg_url = %s WHERE id = %s",
            (source_url, topic_id))


def get_raw_document(topic_id: str) -> dict | None:
    with get_conn() as conn:
        return _one(conn, "SELECT * FROM raw_documents WHERE topic_id = %s", (topic_id,))


def get_crawl_status() -> dict:
    with get_conn() as conn:
        total     = _scalar(conn, "SELECT COUNT(*) FROM topics WHERE depth > 0")
        crawled   = _scalar(conn, "SELECT COUNT(*) FROM raw_documents")
        generated = _scalar(conn, "SELECT COUNT(*) FROM topic_content WHERE learn_content IS NOT NULL")
        return {"total": total, "crawled": crawled, "generated": generated}


# ── Document chunks ───────────────────────────────────────────────────────────

def save_chunks(topic_id: str, chunks: list):
    with get_conn() as conn:
        _run(conn, "DELETE FROM document_chunks WHERE topic_id = %s", (topic_id,))
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(
                cur,
                "INSERT INTO document_chunks (topic_id, chunk_index, content) VALUES (%s,%s,%s)",
                [(topic_id, i, chunk) for i, chunk in enumerate(chunks)],
            )


def get_chunks(topic_id: str) -> list:
    with get_conn() as conn:
        rows = _all(conn,
            "SELECT content FROM document_chunks WHERE topic_id = %s ORDER BY chunk_index",
            (topic_id,))
        return [r["content"] for r in rows]


# ── Topic content (permanent generated content) ───────────────────────────────

def save_topic_content(topic_id: str, data: dict):
    with get_conn() as conn:
        _run(conn, """
            INSERT INTO topic_content
               (topic_id, learn_content, complexity_json, animation_json,
                code_python, code_java, pseudocode, quiz_json, last_updated)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,NOW())
            ON CONFLICT (topic_id) DO UPDATE SET
               learn_content   = EXCLUDED.learn_content,
               complexity_json = EXCLUDED.complexity_json,
               animation_json  = EXCLUDED.animation_json,
               code_python     = EXCLUDED.code_python,
               code_java       = EXCLUDED.code_java,
               pseudocode      = EXCLUDED.pseudocode,
               quiz_json       = EXCLUDED.quiz_json,
               last_updated    = NOW()
        """, (
            topic_id,
            data.get("learn_content"),
            json.dumps(data["complexity_json"]) if isinstance(data.get("complexity_json"), dict) else data.get("complexity_json"),
            json.dumps(data["animation_json"])  if isinstance(data.get("animation_json"),  dict) else data.get("animation_json"),
            data.get("code_python"),
            data.get("code_java"),
            data.get("pseudocode"),
            json.dumps(data["quiz"]) if isinstance(data.get("quiz"), list) else data.get("quiz_json"),
        ))


# ── Feedback ──────────────────────────────────────────────────────────────────

def save_feedback(message: str, rating: int = None, category: str = None,
                  name: str = None, email: str = None,
                  topic_id: str = None, user_id: str = None) -> int:
    with get_conn() as conn:
        row = _one(conn, """
            INSERT INTO feedback (name, email, rating, category, message, topic_id, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (name, email, rating, category, message, topic_id, user_id))
        return row["id"] if row else None


def get_all_feedback(limit: int = 100, offset: int = 0) -> list:
    with get_conn() as conn:
        return _all(conn, """
            SELECT * FROM feedback ORDER BY created_at DESC LIMIT %s OFFSET %s
        """, (limit, offset))


def get_topic_content(topic_id: str) -> dict | None:
    with get_conn() as conn:
        row = _one(conn, "SELECT * FROM topic_content WHERE topic_id = %s", (topic_id,))
        if not row:
            return None
        for field in ("complexity_json", "animation_json", "quiz_json"):
            if row.get(field) and isinstance(row[field], str):
                try:
                    row[field] = json.loads(row[field])
                except Exception:
                    pass
        return row


# ── Quiz bank ──────────────────────────────────────────────────────────────────

def get_quiz_bank_count(topic_id: str, difficulty: str) -> int:
    with get_conn() as conn:
        row = _one(conn,
            "SELECT COUNT(*) AS cnt FROM quiz_bank WHERE topic_id = %s AND difficulty = %s",
            (topic_id, difficulty))
        return int(row["cnt"]) if row else 0


_PLACEHOLDER_OPTS = {'a', 'b', 'c', 'd', 'option a', 'option b', 'option c', 'option d'}

def _is_valid_question(q) -> bool:
    if not isinstance(q, dict):
        return False
    opts = q.get("options", [])
    if len(opts) < 4:
        return False
    # Reject placeholder options
    if any(o.strip().lower() in _PLACEHOLDER_OPTS for o in opts):
        return False
    # Reject options that are too short to be real (< 4 chars each)
    if sum(1 for o in opts if len(o.strip()) < 4) >= 3:
        return False
    # Reject questions where options are embedded in question text
    question = q.get("question", "")
    if any(o.strip() in ('A', 'B', 'C', 'D') for o in opts) and '\nA.' in question:
        return False
    # Reject empty or very short questions
    if len(question.strip()) < 10:
        return False
    return True


def _normalise_options(opts: list) -> list:
    """Strip 'A. ', 'B. ' etc. prefixes so the frontend label doesn't double up."""
    import re
    cleaned = []
    for o in opts:
        cleaned.append(re.sub(r'^[A-Da-d][.)]\s*', '', str(o)).strip())
    return cleaned


def insert_quiz_questions(topic_id: str, difficulty: str, questions: list):
    with get_conn() as conn:
        for q in questions:
            if not _is_valid_question(q):
                print(f"[quiz_bank] skipping invalid question: {q.get('question','')[:60]}")
                continue
            opts = _normalise_options(q.get("options", []))
            _run(conn, """
                INSERT INTO quiz_bank (topic_id, difficulty, question, options, correct_index, explanation, type)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                topic_id, difficulty,
                q.get("question", ""),
                json.dumps(opts),
                int(q.get("correct_index", 0)),
                q.get("explanation", ""),
                q.get("type", "concept"),
            ))


def get_random_quiz_questions(topic_id: str, difficulty: str, count: int = 5) -> list:
    with get_conn() as conn:
        rows = _all(conn, """
            SELECT question, options, correct_index, explanation, type
            FROM quiz_bank
            WHERE topic_id = %s AND difficulty = %s
            ORDER BY RANDOM()
            LIMIT %s
        """, (topic_id, difficulty, count))
        result = []
        for i, r in enumerate(rows):
            opts = r["options"] if isinstance(r["options"], list) else json.loads(r["options"])
            result.append({
                "id":            f"q{i+1}",
                "question":      r["question"],
                "options":       opts,
                "correct_index": r["correct_index"],
                "explanation":   r["explanation"] or "",
                "type":          r["type"] or "concept",
            })
        return result
