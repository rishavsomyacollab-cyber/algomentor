"""
GFG Crawler — fetches article content for DSA topics from GeeksForGeeks.
Uses httpx (async) + BeautifulSoup. Respects rate limits.
"""

import asyncio
import re
import httpx
from bs4 import BeautifulSoup

import database

RATE_LIMIT_SECONDS = 2.0

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
}

# Manual URL overrides for topics whose slug doesn't match GFG's URL pattern
GFG_URL_OVERRIDES: dict[str, str] = {
    "binary_search":       "binary-search",
    "bubble_sort":         "bubble-sort",
    "merge_sort":          "merge-sort",
    "quick_sort":          "quick-sort",
    "heap_sort":           "heap-sort",
    "insertion_sort":      "insertion-sort",
    "selection_sort":      "selection-sort",
    "counting_sort":       "counting-sort",
    "radix_sort":          "radix-sort",
    "two_pointers":        "two-pointers-technique",
    "sliding_window":      "window-sliding-technique",
    "prefix_sum":          "prefix-sum-array",
    "kadane":              "largest-sum-contiguous-subarray",
    "kmp_algorithm":       "kmp-algorithm-for-pattern-searching",
    "linked_list":         "linked-list-set-1-introduction",
    "doubly_linked_list":  "doubly-linked-list",
    "floyds_cycle":        "floyds-cycle-finding-algorithm",
    "reverse_ll":          "reverse-a-linked-list",
    "stack_queue":         "stack-data-structure-introduction-program",
    "monotonic_stack":     "introduction-to-monotonic-stack-2",
    "priority_queue":      "priority-queue-set-1-introduction",
    "deque":               "deque-set-1-introduction",
    "binary_tree":         "binary-tree-set-1-introduction",
    "binary_search_tree":  "binary-search-tree-set-1-search-and-insertion",
    "avl_tree":            "avl-tree-set-1-insertion",
    "segment_tree":        "segment-tree-set-1-sum-of-given-range",
    "fenwick_tree":        "binary-indexed-tree-or-fenwick-tree-2",
    "trie":                "trie-insert-and-search",
    "graph_basics":        "graph-and-its-representations",
    "bfs":                 "breadth-first-search-or-bfs-for-a-graph",
    "dfs":                 "depth-first-search-or-dfs-for-a-graph",
    "dijkstra":            "dijkstras-shortest-path-algorithm-greedy-algo-7",
    "bellman_ford":        "bellman-ford-algorithm-dp-23",
    "floyd_warshall":      "floyd-warshall-algorithm-dp-16",
    "kruskals_mst":        "kruskals-minimum-spanning-tree-algorithm-greedy-algo-2",
    "topological_sort":    "topological-sorting",
    "union_find":          "union-find",
    "fibonacci_dp":        "program-for-nth-fibonacci-number",
    "knapsack":            "0-1-knapsack-problem-dp-10",
    "lcs":                 "longest-common-subsequence-dp-4",
    "lis":                 "longest-increasing-subsequence-dp-3",
    "edit_distance":       "edit-distance-dp-5",
    "coin_change":         "coin-change-dp-7",
    "matrix_chain":        "matrix-chain-multiplication-dp-8",
    "bitmask_dp":          "bitmasking-and-dynamic-programming-set-1-count-ways-to-assign-unique-cap-to-every-person",
    "activity_selection":  "activity-selection-problem-greedy-algo-1",
    "huffman_coding":      "huffman-coding-greedy-algo-3",
    "fractional_knapsack": "fractional-knapsack-problem",
    "n_queens":            "n-queen-problem-backtracking-3",
    "sudoku_solver":       "sudoku-backtracking-7",
    "word_search":         "search-a-word-in-a-2d-grid-of-characters",
    "hash_map":            "hashing-data-structure",
    "rolling_hash":        "rabin-karp-algorithm-for-pattern-searching",
    "sparse_table":        "sparse-table",
    "heavy_light":         "heavy-light-decomposition-set-1-introduction",
    "convex_hull":         "convex-hull-using-jarvis-algorithm-or-wrapping",
}


def _slug_to_gfg_url(topic_id: str) -> str:
    path = GFG_URL_OVERRIDES.get(topic_id, topic_id.replace("_", "-"))
    return f"https://www.geeksforgeeks.org/{path}/"


def _extract_text(html: str) -> str:
    """Extract clean article text from GFG HTML."""
    soup = BeautifulSoup(html, "lxml")

    # Remove noise elements
    for tag in soup.select("script, style, nav, footer, header, .leftBar, "
                           ".rightBar, .article--recommended, .a-d-container, "
                           "[class*='adsbygoogle'], [id*='ad-'], .GFG_AD"):
        tag.decompose()

    # Try known article containers in priority order
    article = (
        soup.find("div", class_="article-body")
        or soup.find("div", {"class": re.compile(r"content|article|text", re.I)})
        or soup.find("article")
        or soup.find("main")
        or soup.find("body")
    )

    if not article:
        return ""

    # Extract text, preserving code blocks
    lines = []
    for elem in article.find_all(["p", "h1", "h2", "h3", "h4", "li", "pre", "code"]):
        text = elem.get_text(separator=" ").strip()
        if text and len(text) > 15:
            if elem.name in ("pre", "code"):
                lines.append(f"```\n{text}\n```")
            else:
                lines.append(text)

    return "\n\n".join(lines)


async def crawl_topic(topic_id: str, topic_name: str) -> str | None:
    """
    Fetch GFG article for a topic. Returns clean text or None on failure.
    Stores result in raw_documents table.
    """
    url = _slug_to_gfg_url(topic_id)
    print(f"[crawler] {topic_name} → {url}")

    try:
        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True,
                                     timeout=20) as client:
            r = await client.get(url)
            if r.status_code == 404:
                # Try alternate URL: just topic name as slug
                alt = topic_name.lower().replace(" ", "-").replace("/", "-")
                r = await client.get(f"https://www.geeksforgeeks.org/{alt}/")
            if r.status_code != 200:
                print(f"[crawler] {topic_id} failed: HTTP {r.status_code}")
                return None

            text = _extract_text(r.text)
            if len(text) < 200:
                print(f"[crawler] {topic_id} extracted too little content ({len(text)} chars)")
                return None

            database.save_raw_document(topic_id, url, text)
            print(f"[crawler] {topic_id} ✓ ({len(text)} chars)")
            return text

    except Exception as e:
        print(f"[crawler] {topic_id} error: {e}")
        return None


async def crawl_all(topic_ids: list[tuple[str, str]] | None = None):
    """
    Crawl all topics (or a given list of (topic_id, topic_name) pairs).
    Rate-limited to RATE_LIMIT_SECONDS between requests.
    """
    if topic_ids is None:
        topics = database.get_all_topics()
        topic_ids = [(t["id"], t["name"]) for t in topics if t.get("depth", 1) > 0]

    already_crawled = {r["topic_id"] for r in _get_all_raw()}
    pending = [(tid, tname) for tid, tname in topic_ids if tid not in already_crawled]

    print(f"[crawler] {len(pending)} topics to crawl (skipping {len(already_crawled)} already done)")

    results = {"success": 0, "failed": 0, "skipped": len(already_crawled)}
    for topic_id, topic_name in pending:
        text = await crawl_topic(topic_id, topic_name)
        if text:
            results["success"] += 1
        else:
            results["failed"] += 1
        await asyncio.sleep(RATE_LIMIT_SECONDS)

    print(f"[crawler] done — {results}")
    return results


def crawl_all_sync(topic_ids=None):
    """Synchronous wrapper for use in background threads."""
    return asyncio.run(crawl_all(topic_ids))


def _get_all_raw() -> list:
    import sqlite3
    from pathlib import Path
    db_path = Path(__file__).parent / "algomentor.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT topic_id FROM raw_documents").fetchall()
    conn.close()
    return rows


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """
    Split text into overlapping word-based chunks.
    chunk_size and overlap are in words (not tokens).
    """
    words = text.split()
    if not words:
        return []
    chunks = []
    step = chunk_size - overlap
    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        if start + chunk_size >= len(words):
            break
    return chunks
