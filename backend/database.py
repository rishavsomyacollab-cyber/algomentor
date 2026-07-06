import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "algomentor.db"

DEFAULT_TOPICS = [
    ("binary_search", "Binary Search", "searching", "Find element in sorted array in O(log n)", "beginner"),
    ("two_pointers", "Two Pointers", "arrays", "Use two indices to solve array problems efficiently", "beginner"),
    ("bubble_sort", "Bubble Sort", "sorting", "Simple comparison-based sorting algorithm", "beginner"),
    ("merge_sort", "Merge Sort", "sorting", "Divide-and-conquer O(n log n) sorting", "intermediate"),
    ("quick_sort", "Quick Sort", "sorting", "In-place divide-and-conquer sorting", "intermediate"),
    ("bfs", "BFS", "graphs", "Breadth-first graph/tree traversal using a queue", "intermediate"),
    ("dfs", "DFS", "graphs", "Depth-first graph/tree traversal using recursion/stack", "intermediate"),
    ("fibonacci_dp", "Fibonacci (DP)", "dynamic_programming", "Memoization and tabulation for overlapping subproblems", "intermediate"),
    ("knapsack", "0/1 Knapsack", "dynamic_programming", "Classic DP problem: maximize value under weight constraint", "advanced"),
    ("linked_list", "Linked List", "data_structures", "Singly/doubly linked list operations", "beginner"),
    ("binary_tree", "Binary Tree", "data_structures", "Tree traversals and basic operations", "intermediate"),
    ("hash_map", "Hash Map", "data_structures", "Key-value store with O(1) average operations", "beginner"),
    ("sliding_window", "Sliding Window", "arrays", "Fixed/variable window technique for subarrays", "intermediate"),
    ("stack_queue", "Stack & Queue", "data_structures", "LIFO/FIFO abstract data types", "beginner"),
]


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                difficulty TEXT DEFAULT 'beginner'
            );

            CREATE TABLE IF NOT EXISTS progress (
                topic_id TEXT PRIMARY KEY,
                completed INTEGER DEFAULT 0,
                quiz_best_score INTEGER DEFAULT 0,
                attempts INTEGER DEFAULT 0,
                last_visited TEXT,
                FOREIGN KEY (topic_id) REFERENCES topics(id)
            );

            CREATE TABLE IF NOT EXISTS quiz_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic_id TEXT NOT NULL,
                question TEXT NOT NULL,
                user_answer TEXT,
                correct INTEGER DEFAULT 0,
                score INTEGER DEFAULT 0,
                timestamp TEXT DEFAULT (datetime('now')),
                FOREIGN KEY (topic_id) REFERENCES topics(id)
            );

            CREATE TABLE IF NOT EXISTS ai_cache (
                cache_key TEXT PRIMARY KEY,
                response TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)

        existing = conn.execute("SELECT id FROM topics").fetchall()
        existing_ids = {r["id"] for r in existing}
        for row in DEFAULT_TOPICS:
            if row[0] not in existing_ids:
                conn.execute(
                    "INSERT INTO topics (id, name, category, description, difficulty) VALUES (?,?,?,?,?)",
                    row,
                )


def get_all_topics():
    with get_conn() as conn:
        topics = conn.execute("SELECT * FROM topics ORDER BY category, difficulty").fetchall()
        progress = conn.execute("SELECT * FROM progress").fetchall()
        prog_map = {r["topic_id"]: dict(r) for r in progress}
        result = []
        for t in topics:
            t_dict = dict(t)
            t_dict["progress"] = prog_map.get(t_dict["id"], {"completed": 0, "quiz_best_score": 0, "attempts": 0})
            result.append(t_dict)
        return result


def get_topic(topic_id: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM topics WHERE id = ?", (topic_id,)).fetchone()
        return dict(row) if row else None


def get_progress():
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT t.id, t.name, t.category, t.difficulty,
                   COALESCE(p.completed, 0) as completed,
                   COALESCE(p.quiz_best_score, 0) as quiz_best_score,
                   COALESCE(p.attempts, 0) as attempts,
                   p.last_visited
            FROM topics t
            LEFT JOIN progress p ON t.id = p.topic_id
        """).fetchall()
        return [dict(r) for r in rows]


def save_progress(topic_id: str, completed: bool = False, quiz_score: int = None):
    with get_conn() as conn:
        existing = conn.execute("SELECT * FROM progress WHERE topic_id = ?", (topic_id,)).fetchone()
        if existing:
            updates = ["attempts = attempts + 1", "last_visited = datetime('now')"]
            params = []
            if completed:
                updates.append("completed = 1")
            if quiz_score is not None:
                updates.append("quiz_best_score = MAX(quiz_best_score, ?)")
                params.append(quiz_score)
            params.append(topic_id)
            conn.execute(f"UPDATE progress SET {', '.join(updates)} WHERE topic_id = ?", params)
        else:
            conn.execute(
                "INSERT INTO progress (topic_id, completed, quiz_best_score, attempts, last_visited) VALUES (?,?,?,1,datetime('now'))",
                (topic_id, 1 if completed else 0, quiz_score or 0),
            )


def save_quiz_attempt(topic_id: str, question: str, user_answer: str, correct: bool, score: int):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO quiz_history (topic_id, question, user_answer, correct, score) VALUES (?,?,?,?,?)",
            (topic_id, question, user_answer, 1 if correct else 0, score),
        )


# ── AI response cache (persists across restarts) ─────────────────────────────

def cache_get(key: str):
    import json
    with get_conn() as conn:
        row = conn.execute("SELECT response FROM ai_cache WHERE cache_key = ?", (key,)).fetchone()
        return json.loads(row["response"]) if row else None


def cache_set(key: str, value: dict):
    import json
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO ai_cache (cache_key, response) VALUES (?, ?)",
            (key, json.dumps(value)),
        )


def cache_keys():
    with get_conn() as conn:
        rows = conn.execute("SELECT cache_key FROM ai_cache").fetchall()
        return {r["cache_key"] for r in rows}
