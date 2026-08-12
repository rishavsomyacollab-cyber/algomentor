export const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  searching:           { label: "Searching",            icon: "🔍" },
  sorting:             { label: "Sorting",               icon: "↕️" },
  arrays:              { label: "Arrays & Strings",      icon: "▦" },
  graphs:              { label: "Graphs & Trees",        icon: "🌿" },
  dynamic_programming: { label: "Dynamic Programming",   icon: "⚡" },
  data_structures:     { label: "Data Structures",       icon: "🗂️" },
  greedy:              { label: "Greedy",                icon: "🪙" },
  backtracking:        { label: "Backtracking",          icon: "🔙" },
};

export const TOPIC_ICONS: Record<string, string> = {
  binary_search:"🔎", two_pointers:"👇", sliding_window:"🪟", prefix_sum:"Σ", kadane:"📈",
  linked_list:"🔗", doubly_linked_list:"🔗", stack_queue:"📚", monotonic_stack:"📉",
  deque:"↔️", priority_queue:"🏆", binary_tree:"🌳", binary_search_tree:"🌲",
  avl_tree:"⚖️", segment_tree:"🌿", fenwick_tree:"🌾", trie:"🔤", hash_map:"🗃️",
  graph_basics:"🕸️", bfs:"🌊", dfs:"🕳️", topological_sort:"↓", dijkstra:"🗺️",
  bellman_ford:"🛤️", floyd_warshall:"🔄", kruskals_mst:"🌐", union_find:"🔀",
  bubble_sort:"🫧", merge_sort:"🔀", quick_sort:"⚡", heap_sort:"🏔️",
  insertion_sort:"🃏", selection_sort:"🎯", counting_sort:"🔢", radix_sort:"📊",
  fibonacci_dp:"🌀", knapsack:"🎒", lcs:"📝", lis:"📈", edit_distance:"✏️",
  coin_change:"🪙", matrix_chain:"🔲", bitmask_dp:"🎭", n_queens:"♛",
  sudoku_solver:"🔲", word_search:"🔤", huffman_coding:"📦",
  activity_selection:"🗓️", fractional_knapsack:"⚖️", kmp_algorithm:"🔍",
  rolling_hash:"#️⃣", sparse_table:"📋", heavy_light:"⚙️", convex_hull:"🔵",
};

export const DIFF_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  beginner:     { bg: "rgba(16,185,129,.1)",  text: "#34d399", border: "rgba(16,185,129,.2)" },
  intermediate: { bg: "rgba(245,158,11,.1)",  text: "#fbbf24", border: "rgba(245,158,11,.2)" },
  advanced:     { bg: "rgba(239,68,68,.1)",   text: "#f87171", border: "rgba(239,68,68,.2)"  },
};
