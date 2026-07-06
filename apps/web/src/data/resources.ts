// Curated resources per DSA topic.
// YouTube links use search URLs so they never go stale.
// Blogs link directly to the topic page.

const YT = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
const GFG = (slug: string) => `https://www.geeksforgeeks.org/${slug}/`;
const PROG = (slug: string) => `https://www.programiz.com/dsa/${slug}`;
const VIS = (slug: string) => `https://visualgo.net/en/${slug}`;

const TOPICS = {
  "array": {
    youtube: [
      { title: "Arrays Data Structure – Abdul Bari", url: YT("arrays data structure Abdul Bari") },
      { title: "Array Basics for Beginners – CS Dojo", url: YT("array data structure CS Dojo beginners") },
    ],
    blogs: [
      { title: "Arrays – GeeksforGeeks", url: GFG("array-data-structure") },
      { title: "Arrays – Programiz", url: PROG("array") },
    ],
  },

  "sorting": {
    youtube: [
      { title: "All Sorting Algorithms Explained – Abdul Bari", url: YT("sorting algorithms explained Abdul Bari") },
      { title: "Sorting Algorithms Visualized", url: YT("sorting algorithms visualization comparison") },
    ],
    blogs: [
      { title: "Sorting Algorithms – GeeksforGeeks", url: GFG("sorting-algorithms") },
      { title: "Sorting Visualizer", url: VIS("sorting") },
    ],
  },

  "binary search": {
    youtube: [
      { title: "Binary Search Algorithm – NeetCode", url: YT("binary search algorithm NeetCode") },
      { title: "Binary Search Explained Simply – Khan Academy", url: YT("binary search Khan Academy tutorial") },
    ],
    blogs: [
      { title: "Binary Search – GeeksforGeeks", url: GFG("binary-search") },
      { title: "Binary Search Visualizer", url: VIS("bst") },
    ],
  },

  "two pointers": {
    youtube: [
      { title: "Two Pointers Technique – NeetCode", url: YT("two pointers technique NeetCode tutorial") },
      { title: "Two Pointers Pattern Explained", url: YT("two pointers algorithm pattern explained") },
    ],
    blogs: [
      { title: "Two Pointers – GeeksforGeeks", url: GFG("two-pointers-technique") },
      { title: "Two Pointers – LeetCode Patterns", url: "https://leetcode.com/tag/two-pointers/" },
    ],
  },

  "sliding window": {
    youtube: [
      { title: "Sliding Window Technique – NeetCode", url: YT("sliding window technique NeetCode") },
      { title: "Sliding Window Algorithm Tutorial", url: YT("sliding window algorithm tutorial explained") },
    ],
    blogs: [
      { title: "Sliding Window – GeeksforGeeks", url: GFG("window-sliding-technique") },
      { title: "Sliding Window – LeetCode", url: "https://leetcode.com/tag/sliding-window/" },
    ],
  },

  "recursion": {
    youtube: [
      { title: "Recursion in Programming – freeCodeCamp", url: YT("recursion programming freeCodeCamp full course") },
      { title: "Recursion Explained – Abdul Bari", url: YT("recursion Abdul Bari tower of hanoi") },
    ],
    blogs: [
      { title: "Recursion – GeeksforGeeks", url: GFG("recursion") },
      { title: "Recursion – Programiz", url: PROG("recursion") },
    ],
  },

  "linked list": {
    youtube: [
      { title: "Linked Lists – mycodeschool", url: YT("linked list mycodeschool playlist") },
      { title: "Linked List Full Course – freeCodeCamp", url: YT("linked list data structure freeCodeCamp") },
    ],
    blogs: [
      { title: "Linked List – GeeksforGeeks", url: GFG("data-structures-linked-list") },
      { title: "Linked List Visualizer", url: VIS("list") },
    ],
  },

  "stack": {
    youtube: [
      { title: "Stack Data Structure – mycodeschool", url: YT("stack data structure mycodeschool") },
      { title: "Stacks and Queues – CS Dojo", url: YT("stack queue data structure CS Dojo") },
    ],
    blogs: [
      { title: "Stack – GeeksforGeeks", url: GFG("stack-data-structure") },
      { title: "Stack Visualizer", url: VIS("list") },
    ],
  },

  "queue": {
    youtube: [
      { title: "Queue Data Structure – mycodeschool", url: YT("queue data structure mycodeschool") },
      { title: "Queue Tutorial – freeCodeCamp", url: YT("queue data structure tutorial freeCodeCamp") },
    ],
    blogs: [
      { title: "Queue – GeeksforGeeks", url: GFG("queue-data-structure") },
      { title: "Queue Visualizer", url: VIS("list") },
    ],
  },

  "tree": {
    youtube: [
      { title: "Tree Data Structure – mycodeschool", url: YT("tree data structure mycodeschool") },
      { title: "Binary Tree – Abdul Bari", url: YT("binary tree Abdul Bari tutorial") },
    ],
    blogs: [
      { title: "Tree – GeeksforGeeks", url: GFG("tree-data-structure") },
      { title: "Tree Visualizer", url: VIS("bst") },
    ],
  },

  "binary tree": {
    youtube: [
      { title: "Binary Tree Traversals – mycodeschool", url: YT("binary tree traversal inorder preorder postorder mycodeschool") },
      { title: "Binary Trees – Abdul Bari", url: YT("binary tree Abdul Bari lecture") },
    ],
    blogs: [
      { title: "Binary Tree – GeeksforGeeks", url: GFG("binary-tree-data-structure") },
      { title: "Binary Tree Visualizer", url: VIS("bst") },
    ],
  },

  "graph": {
    youtube: [
      { title: "Graph Theory – William Fiset (Full Playlist)", url: YT("graph theory William Fiset algorithms playlist") },
      { title: "Graphs for Beginners – freeCodeCamp", url: YT("graph data structure beginners freeCodeCamp") },
    ],
    blogs: [
      { title: "Graph – GeeksforGeeks", url: GFG("graph-data-structure-and-algorithms") },
      { title: "Graph Visualizer", url: VIS("graphds") },
    ],
  },

  "bfs": {
    youtube: [
      { title: "BFS (Breadth First Search) – William Fiset", url: YT("breadth first search William Fiset") },
      { title: "BFS Algorithm – NeetCode", url: YT("BFS algorithm NeetCode") },
    ],
    blogs: [
      { title: "BFS – GeeksforGeeks", url: GFG("breadth-first-search-or-bfs-for-a-graph") },
      { title: "BFS/DFS Visualizer", url: VIS("dfsbfs") },
    ],
  },

  "dfs": {
    youtube: [
      { title: "DFS (Depth First Search) – William Fiset", url: YT("depth first search William Fiset") },
      { title: "DFS Algorithm – NeetCode", url: YT("DFS algorithm NeetCode tutorial") },
    ],
    blogs: [
      { title: "DFS – GeeksforGeeks", url: GFG("depth-first-search-or-dfs-for-a-graph") },
      { title: "BFS/DFS Visualizer", url: VIS("dfsbfs") },
    ],
  },

  "hash map": {
    youtube: [
      { title: "Hash Tables – CS Dojo", url: YT("hash table hash map CS Dojo") },
      { title: "Hashing – Abdul Bari", url: YT("hashing data structure Abdul Bari") },
    ],
    blogs: [
      { title: "Hashing – GeeksforGeeks", url: GFG("hashing-data-structure") },
      { title: "Hash Table Visualizer", url: VIS("hashtable") },
    ],
  },

  "dynamic programming": {
    youtube: [
      { title: "Dynamic Programming – freeCodeCamp (5hrs)", url: YT("dynamic programming freeCodeCamp full course") },
      { title: "DP Patterns – NeetCode", url: YT("dynamic programming NeetCode patterns") },
    ],
    blogs: [
      { title: "Dynamic Programming – GeeksforGeeks", url: GFG("dynamic-programming") },
      { title: "DP Patterns – LeetCode", url: "https://leetcode.com/tag/dynamic-programming/" },
    ],
  },

  "memoization": {
    youtube: [
      { title: "Memoization vs Tabulation – NeetCode", url: YT("memoization tabulation dynamic programming NeetCode") },
      { title: "Memoization Explained – freeCodeCamp", url: YT("memoization explained recursion freeCodeCamp") },
    ],
    blogs: [
      { title: "Memoization – GeeksforGeeks", url: GFG("memoization-1d-2d-and-3d") },
    ],
  },

  "big o": {
    youtube: [
      { title: "Big O Notation – CS Dojo", url: YT("big O notation CS Dojo") },
      { title: "Big O for Beginners – freeCodeCamp", url: YT("big O notation beginners freeCodeCamp") },
    ],
    blogs: [
      { title: "Big O Cheat Sheet", url: "https://www.bigocheatsheet.com/" },
      { title: "Big O – GeeksforGeeks", url: GFG("analysis-algorithms-big-o-analysis") },
    ],
  },

  "merge sort": {
    youtube: [
      { title: "Merge Sort – Abdul Bari", url: YT("merge sort Abdul Bari") },
      { title: "Merge Sort – NeetCode", url: YT("merge sort NeetCode") },
    ],
    blogs: [
      { title: "Merge Sort – GeeksforGeeks", url: GFG("merge-sort") },
      { title: "Merge Sort Visualizer", url: VIS("sorting") },
    ],
  },

  "quick sort": {
    youtube: [
      { title: "Quick Sort – Abdul Bari", url: YT("quick sort Abdul Bari") },
      { title: "Quick Sort – NeetCode", url: YT("quicksort NeetCode tutorial") },
    ],
    blogs: [
      { title: "Quick Sort – GeeksforGeeks", url: GFG("quick-sort") },
      { title: "Sorting Visualizer", url: VIS("sorting") },
    ],
  },

  "divide and conquer": {
    youtube: [
      { title: "Divide and Conquer – Abdul Bari", url: YT("divide and conquer Abdul Bari algorithm") },
    ],
    blogs: [
      { title: "Divide and Conquer – GeeksforGeeks", url: GFG("divide-and-conquer") },
    ],
  },
};

// Aliases — normalise common variations to canonical keys
const ALIASES: Record<string, string> = {
  "arrays": "array",
  // two pointers — catch every form the model might return
  "two_pointers": "two pointers",
  "two pointer": "two pointers",
  "pointer": "two pointers",
  "pointers": "two pointers",
  "two-pointer": "two pointers",
  "two-pointers": "two pointers",
  // sliding window
  "sliding_window": "sliding window",
  "sliding-window": "sliding window",
  // linked list
  "linked_list": "linked list",
  "linked-list": "linked list",
  // binary search
  "binary_search": "binary search",
  "binary-search": "binary search",
  // binary tree
  "binary_tree": "binary tree",
  "binary-tree": "binary tree",
  // hash map
  "hash_map": "hash map",
  "hashmap": "hash map",
  "hash table": "hash map",
  "hash_table": "hash map",
  "hashtable": "hash map",
  // dynamic programming
  "dynamic_programming": "dynamic programming",
  "dynamic-programming": "dynamic programming",
  "dp": "dynamic programming",
  // sort variants
  "merge_sort": "merge sort",
  "merge-sort": "merge sort",
  "quick_sort": "quick sort",
  "quick-sort": "quick sort",
  // plurals
  "graphs": "graph",
  "trees": "tree",
  "stacks": "stack",
  "queues": "queue",
  // complexity
  "big o notation": "big o",
  "bigo": "big o",
  "time complexity": "big o",
  "space complexity": "big o",
};

export function getResources(prereq: string) {
  const raw = prereq.toLowerCase().trim();
  const key = ALIASES[raw] || raw;
  const topicsMap = TOPICS as Record<string, { youtube: { title: string; url: string }[]; blogs: { title: string; url: string }[] }>;
  if (topicsMap[key]) return topicsMap[key];

  // fallback: YouTube search + GFG search, both scoped to the exact topic name
  const q = encodeURIComponent(prereq + " data structure algorithm tutorial");
  const gfgQ = prereq.toLowerCase().replace(/\s+/g, "-");
  return {
    youtube: [
      { title: `"${prereq}" tutorial – YouTube search`, url: `https://www.youtube.com/results?search_query=${q}` },
      { title: `"${prereq}" NeetCode – YouTube`, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(prereq + " NeetCode")}` },
    ],
    blogs: [
      { title: `"${prereq}" – GeeksforGeeks`, url: `https://www.geeksforgeeks.org/search/${encodeURIComponent(prereq)}/` },
      { title: `"${prereq}" – Programiz`, url: `https://www.programiz.com/search?q=${encodeURIComponent(prereq)}` },
    ],
  };
}
