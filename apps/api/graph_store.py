"""
GraphStore — Neo4j-backed topic prerequisite graph and learning-path recommendations.

Nodes:   Topic {id, name, difficulty, category}
Edges:   PREREQUISITE  — must know A before studying B
         RELATED       — closely related, similar or complementary
         (User nodes added in Phase 9)

All methods return [] / "" when Neo4j is unreachable so the rest of the
app degrades gracefully.  Start Neo4j with:
  docker run -p7474:7474 -p7687:7687 -e NEO4J_AUTH=none neo4j
"""

import os
from typing import Optional

NEO4J_URI  = os.getenv("NEO4J_URI",     "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER",    "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASSWORD","")

# ── Edge map ──────────────────────────────────────────────────────────────────
# (source_id, target_id, relationship_type)
# PREREQUISITE: you should know `source` before learning `target`
# RELATED:      they are closely related / good to study together

EDGES: list[tuple[str, str, str]] = [
    # ── Arrays ────────────────────────────────────────────────────────────────
    ("two_pointers",    "sliding_window",       "PREREQUISITE"),
    ("two_pointers",    "kadane",               "RELATED"),
    ("prefix_sum",      "kadane",               "PREREQUISITE"),
    ("sliding_window",  "kadane",               "RELATED"),
    ("two_pointers",    "binary_search",        "RELATED"),

    # ── Sorting ───────────────────────────────────────────────────────────────
    ("bubble_sort",     "selection_sort",       "RELATED"),
    ("bubble_sort",     "insertion_sort",       "RELATED"),
    ("insertion_sort",  "merge_sort",           "PREREQUISITE"),
    ("merge_sort",      "quick_sort",           "RELATED"),
    ("merge_sort",      "heap_sort",            "RELATED"),
    ("heap_sort",       "counting_sort",        "RELATED"),
    ("counting_sort",   "radix_sort",           "PREREQUISITE"),

    # ── Searching ─────────────────────────────────────────────────────────────
    ("binary_search",   "binary_search_tree",   "PREREQUISITE"),
    ("binary_search",   "merge_sort",           "RELATED"),

    # ── Linked List ───────────────────────────────────────────────────────────
    ("linked_list",     "doubly_linked_list",   "PREREQUISITE"),
    ("linked_list",     "floyds_cycle",         "PREREQUISITE"),
    ("linked_list",     "reverse_ll",           "PREREQUISITE"),
    ("linked_list",     "stack_queue",          "PREREQUISITE"),

    # ── Stacks / Queues ───────────────────────────────────────────────────────
    ("stack_queue",     "monotonic_stack",      "PREREQUISITE"),
    ("stack_queue",     "deque",                "PREREQUISITE"),
    ("stack_queue",     "priority_queue",       "RELATED"),

    # ── Trees ─────────────────────────────────────────────────────────────────
    ("binary_tree",         "binary_search_tree",   "PREREQUISITE"),
    ("binary_search_tree",  "avl_tree",             "PREREQUISITE"),
    ("binary_search_tree",  "trie",                 "RELATED"),
    ("binary_search_tree",  "segment_tree",         "RELATED"),
    ("segment_tree",        "fenwick_tree",         "RELATED"),
    ("segment_tree",        "sparse_table",         "RELATED"),
    ("segment_tree",        "heavy_light",          "PREREQUISITE"),
    ("priority_queue",      "heap_sort",            "RELATED"),

    # ── Hashing ───────────────────────────────────────────────────────────────
    ("hash_map",        "rolling_hash",         "PREREQUISITE"),
    ("hash_map",        "lcs",                  "RELATED"),
    ("rolling_hash",    "kmp_algorithm",        "RELATED"),

    # ── Graphs ────────────────────────────────────────────────────────────────
    ("graph_basics",    "bfs",                  "PREREQUISITE"),
    ("graph_basics",    "dfs",                  "PREREQUISITE"),
    ("graph_basics",    "union_find",           "PREREQUISITE"),
    ("bfs",             "topological_sort",     "RELATED"),
    ("dfs",             "topological_sort",     "PREREQUISITE"),
    ("dfs",             "kosa_raju",            "PREREQUISITE"),
    ("bfs",             "dijkstra",             "PREREQUISITE"),
    ("priority_queue",  "dijkstra",             "PREREQUISITE"),
    ("priority_queue",  "dijkstra_algorithm",   "PREREQUISITE"),
    ("dijkstra",        "dijkstra_algorithm",   "RELATED"),
    ("dijkstra",        "bellman_ford",         "RELATED"),
    ("bellman_ford",    "floyd_warshall",       "RELATED"),
    ("topological_sort","floyd_warshall",       "RELATED"),
    ("union_find",      "kruskals_mst",         "PREREQUISITE"),
    ("priority_queue",  "kruskals_mst",         "RELATED"),

    # ── Dynamic Programming ───────────────────────────────────────────────────
    ("fibonacci_dp",    "coin_change",          "PREREQUISITE"),
    ("fibonacci_dp",    "lis",                  "PREREQUISITE"),
    ("fibonacci_dp",    "lcs",                  "PREREQUISITE"),
    ("fibonacci_dp",    "edit_distance",        "PREREQUISITE"),
    ("fibonacci_dp",    "knapsack",             "PREREQUISITE"),
    ("lcs",             "edit_distance",        "RELATED"),
    ("knapsack",        "bitmask_dp",           "PREREQUISITE"),
    ("knapsack",        "matrix_chain",         "RELATED"),
    ("knapsack",        "fractional_knapsack",  "RELATED"),

    # ── Greedy ────────────────────────────────────────────────────────────────
    ("priority_queue",  "huffman_coding",       "PREREQUISITE"),
    ("activity_selection", "fractional_knapsack", "RELATED"),

    # ── Backtracking ─────────────────────────────────────────────────────────
    ("n_queens",        "sudoku_solver",        "RELATED"),
    ("word_search",     "n_queens",             "RELATED"),
    ("dfs",             "n_queens",             "PREREQUISITE"),
    ("dfs",             "word_search",          "PREREQUISITE"),

    # ── Advanced ─────────────────────────────────────────────────────────────
    ("heavy_light",     "sparse_table",         "RELATED"),
]

# ── Singleton ─────────────────────────────────────────────────────────────────

_graph: Optional["GraphStore"] = None


def get_graph() -> "GraphStore":
    global _graph
    if _graph is None:
        _graph = GraphStore()
    return _graph


# ── GraphStore ────────────────────────────────────────────────────────────────

class GraphStore:
    def __init__(self):
        self._driver = None
        self._connect()

    def _connect(self):
        try:
            from neo4j import GraphDatabase
            auth = (NEO4J_USER, NEO4J_PASS) if NEO4J_PASS else ("neo4j", "")
            self._driver = GraphDatabase.driver(NEO4J_URI, auth=auth)
            self._driver.verify_connectivity()
            print("[graph] connected to Neo4j")
        except Exception as e:
            print(f"[graph] Neo4j not available ({e}) — running without graph features")
            self._driver = None

    @property
    def available(self) -> bool:
        return self._driver is not None

    def _run(self, cypher: str, **params):
        """Execute a Cypher query and return all records."""
        if not self._driver:
            return []
        try:
            with self._driver.session() as session:
                return list(session.run(cypher, **params))
        except Exception as e:
            print(f"[graph] query error: {e}")
            return []

    # ── Graph initialisation ──────────────────────────────────────────────────

    def init_graph(self, topics: list) -> None:
        """Create Topic nodes and all PREREQUISITE/RELATED edges."""
        if not self._driver:
            return

        # Constraints and indexes
        self._run("CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE")
        self._run("CREATE INDEX topic_cat IF NOT EXISTS FOR (t:Topic) ON (t.category)")

        # Upsert Topic nodes
        with self._driver.session() as session:
            for t in topics:
                if t.get("depth", 1) == 0:
                    continue
                session.run(
                    """
                    MERGE (t:Topic {id: $id})
                    SET t.name       = $name,
                        t.difficulty = $difficulty,
                        t.category   = $category,
                        t.description = $description
                    """,
                    id=t["id"], name=t["name"],
                    difficulty=t.get("difficulty", ""),
                    category=t.get("category", ""),
                    description=t.get("description", ""),
                )

        # Upsert edges — skip if either node doesn't exist
        topic_ids = {t["id"] for t in topics if t.get("depth", 1) > 0}
        with self._driver.session() as session:
            for src, dst, rel in EDGES:
                if src not in topic_ids or dst not in topic_ids:
                    continue
                session.run(
                    f"""
                    MATCH (a:Topic {{id: $src}}), (b:Topic {{id: $dst}})
                    MERGE (a)-[:{rel}]->(b)
                    """,
                    src=src, dst=dst,
                )
        print(f"[graph] graph initialised — {len(topics)} topics, {len(EDGES)} edges")

    # ── Query helpers ─────────────────────────────────────────────────────────

    def get_prerequisites(self, topic_id: str) -> list[dict]:
        """Return direct prerequisites for a topic (what to learn first)."""
        rows = self._run(
            """
            MATCH (pre:Topic)-[:PREREQUISITE]->(t:Topic {id: $id})
            RETURN pre.id AS id, pre.name AS name,
                   pre.difficulty AS difficulty, pre.category AS category
            """,
            id=topic_id,
        )
        return [dict(r) for r in rows]

    def get_next_topics(self, topic_id: str) -> list[dict]:
        """Return what you can learn AFTER this topic (direct outgoing prerequisites)."""
        rows = self._run(
            """
            MATCH (t:Topic {id: $id})-[:PREREQUISITE]->(next:Topic)
            RETURN next.id AS id, next.name AS name,
                   next.difficulty AS difficulty, next.category AS category
            """,
            id=topic_id,
        )
        return [dict(r) for r in rows]

    def get_related(self, topic_id: str) -> list[dict]:
        """Return topics with a RELATED edge in either direction."""
        rows = self._run(
            """
            MATCH (t:Topic {id: $id})-[:RELATED]-(rel:Topic)
            RETURN DISTINCT rel.id AS id, rel.name AS name,
                   rel.difficulty AS difficulty, rel.category AS category
            """,
            id=topic_id,
        )
        return [dict(r) for r in rows]

    def get_learning_path(self, from_id: str, to_id: str, max_hops: int = 6) -> list[dict]:
        """
        Shortest prerequisite path between two topics.
        Returns ordered list of topics from source to destination.
        """
        rows = self._run(
            """
            MATCH path = shortestPath(
              (a:Topic {id: $from_id})-[:PREREQUISITE*1..$max_hops]->(b:Topic {id: $to_id})
            )
            UNWIND nodes(path) AS t
            RETURN t.id AS id, t.name AS name,
                   t.difficulty AS difficulty, t.category AS category
            """,
            from_id=from_id, to_id=to_id, max_hops=max_hops,
        )
        return [dict(r) for r in rows]

    def get_topic_neighborhood(self, topic_id: str) -> dict:
        """
        Return the immediate graph neighborhood: prerequisites, next-topics, related.
        Used by the frontend graph visualisation.
        """
        return {
            "prerequisites": self.get_prerequisites(topic_id),
            "next":          self.get_next_topics(topic_id),
            "related":       self.get_related(topic_id),
        }

    def get_recommendations_for_user(self, completed_ids: list[str],
                                     limit: int = 5) -> list[dict]:
        """
        'What should I learn next?' — topics reachable via PREREQUISITE/RELATED
        from completed topics that the user hasn't done yet.
        Ranked by how many completed topics point toward them.
        """
        if not completed_ids:
            return []
        rows = self._run(
            """
            MATCH (done:Topic)-[:PREREQUISITE|RELATED]->(next:Topic)
            WHERE done.id IN $completed
              AND NOT next.id IN $completed
            WITH next, count(*) AS relevance
            ORDER BY relevance DESC
            LIMIT $limit
            RETURN next.id AS id, next.name AS name,
                   next.difficulty AS difficulty, next.category AS category,
                   relevance
            """,
            completed=completed_ids, limit=limit,
        )
        return [dict(r) for r in rows]

    def get_category_subgraph(self, category: str) -> list[dict]:
        """Return all edges within a category for graph visualisation."""
        rows = self._run(
            """
            MATCH (a:Topic {category: $cat})-[r:PREREQUISITE|RELATED]->(b:Topic {category: $cat})
            RETURN a.id AS source, b.id AS target, type(r) AS rel_type
            """,
            cat=category,
        )
        return [dict(r) for r in rows]

    def close(self):
        if self._driver:
            self._driver.close()
