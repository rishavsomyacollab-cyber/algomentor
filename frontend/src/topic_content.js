export const RICH_CONTENT = {
  binary_search: {
    concept: "Binary Search",
    tagline: "Halve your search space every step — from 1 billion to 1 in 30 comparisons.",
    introduction:
      "Binary search is a classic divide-and-conquer algorithm that finds a target value within a sorted array by repeatedly halving the search interval. At each step it compares the target to the middle element and discards the half that cannot contain the answer. This yields O(log n) time complexity — far superior to O(n) linear scan for large datasets. It is the foundation of countless real-world systems including database index lookups, OS memory mapping, and dictionary implementations. Mastering binary search also unlocks a mental model — 'search on the answer space' — that solves many advanced problems beyond simple element lookup.",
    intuition:
      "Think of finding a word in a physical dictionary: you open to the middle, see whether your word comes before or after, then open to the middle of the remaining half. You never re-read pages you've already eliminated. This is exactly what binary search does — it leverages sorted order to confidently throw away half the data at every step.",
    how_it_works: [
      "1. Verify the array is sorted (ascending). Set left = 0, right = n - 1.",
      "2. Enter a loop that continues while left <= right.",
      "3. Compute mid = left + (right - left) // 2 (avoids integer overflow vs. (left+right)//2).",
      "4. Compare arr[mid] with the target.",
      "5. If arr[mid] == target, return mid — element found.",
      "6. If arr[mid] < target, the answer must be in the right half; set left = mid + 1.",
      "7. If arr[mid] > target, the answer must be in the left half; set right = mid - 1.",
      "8. If the loop ends without returning, the target is not in the array; return -1.",
    ],
    worked_example: {
      label: "Search for target=23 in arr=[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]",
      steps: [
        "Initial:  left=0, right=9, arr=[2,5,8,12,16,23,38,56,72,91]",
        "Step 1:   mid=4, arr[4]=16 < 23 → move left=5",
        "Step 2:   left=5, right=9, mid=7, arr[7]=56 > 23 → move right=6",
        "Step 3:   left=5, right=6, mid=5, arr[5]=23 == 23 → FOUND",
        "Result:   return index 5 ✓ (3 comparisons vs 6 linear)",
      ],
      result: "Index 5 found in 3 comparisons (log₂10 ≈ 3.3)",
    },
    code: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = left + (right - left) // 2  # avoids overflow
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1  # not found

# Example usage
arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print(binary_search(arr, 23))   # → 5
print(binary_search(arr, 99))   # → -1`,
    time_complexity: {
      best: "O(1)",
      average: "O(log n)",
      worst: "O(log n)",
      note: "Each iteration halves the search space. For n=10^9, at most ~30 comparisons are needed.",
    },
    space_complexity: {
      value: "O(1)",
      note: "Iterative version uses only three integer variables. Recursive version costs O(log n) stack frames.",
    },
    advantages: [
      "Extremely fast — O(log n) makes it practical even for billions of elements.",
      "Simple to implement once the invariants are understood.",
      "Works on any sorted random-access data structure.",
      "Can be adapted to 'search on answer space' for optimization problems.",
    ],
    disadvantages: [
      "Requires the array to be sorted — sorting costs O(n log n) upfront.",
      "Requires random-access (arrays); does not work on linked lists efficiently.",
      "Off-by-one errors in boundary conditions are a very common source of bugs.",
      "Not suitable for dynamic datasets with frequent insertions/deletions.",
    ],
    applications: [
      "Dictionary / spell-checker lookups",
      "Database B-tree index traversal",
      "Finding a function's root (bisection method)",
      "Git bisect for debugging regressions",
      "Searching package versions in dependency resolvers",
      "OS page-fault address lookup in memory maps",
      "Square root / nth root computation",
    ],
    common_mistakes: [
      {
        title: "Using mid = (left + right) // 2",
        description:
          "In languages with fixed-size integers (Java, C++), left + right can overflow when both are large. Use mid = left + (right - left) // 2 instead. Python has arbitrary-precision integers so it is safe there, but the habit is worth building.",
      },
      {
        title: "Wrong loop condition: left < right instead of left <= right",
        description:
          "Using strict less-than causes the loop to exit one step early, missing the single-element subarray where the target might live. Always use left <= right for a standard binary search.",
      },
      {
        title: "Forgetting to update left or right (infinite loop)",
        description:
          "If you forget to write left = mid + 1 or right = mid - 1, the loop never makes progress. The search window must strictly shrink every iteration.",
      },
      {
        title: "Applying binary search on an unsorted array",
        description:
          "Binary search is only correct on sorted data. Applying it to unsorted input gives wrong results silently — always verify the precondition.",
      },
    ],
    tips: [
      "Use the template: left=0, right=n-1, mid=left+(right-left)//2, then branch on <, >, ==.",
      "For 'find first/last occurrence' problems, do not return immediately on match — adjust the boundary and keep searching.",
      "Binary search on the answer space: if you can define a monotone predicate on integers, you can binary search on possible answer values, not just array indices.",
      "Always trace through a 1-element and 2-element array to verify your boundary conditions.",
    ],
    fun_fact:
      "Despite being described in academic papers since 1946, the first completely correct published binary search implementation appeared only in 1962 — 16 years of bugs in the literature. Jon Bentley's 1986 study found that 90% of professional programmers could not write a bug-free binary search in two hours.",
  },

  two_pointers: {
    concept: "Two Pointers",
    tagline: "Two indices, one array, linear time — elegance through symmetry.",
    introduction:
      "The two-pointer technique solves problems on sorted arrays (or strings) by maintaining two indices that move toward each other or in the same direction, narrowing down the solution space without nested loops. It transforms what would naively be an O(n²) brute-force search into an O(n) scan. The key insight is that sorted order lets you make a greedy decision at every step: if the sum of two elements is too large, move the right pointer left; if too small, move the left pointer right. The technique generalises to 'fast and slow' pointers for cycle detection in linked lists, and to three-pointer and k-pointer variants for harder problems.",
    intuition:
      "Imagine two people standing at opposite ends of a row of numbered seats, walking toward each other. One checks from the left and one from the right. At each step, whoever needs a larger number walks inward. They will meet exactly when they find the pair that satisfies the condition — no backtracking, no wasted steps. This is precisely the two-pointer dance on a sorted array.",
    how_it_works: [
      "1. Sort the array if it isn't already (required for the greedy step to be valid).",
      "2. Place left pointer at index 0 and right pointer at index n-1.",
      "3. Compute the current pair sum (or product, or difference) at arr[left] + arr[right].",
      "4. If the sum equals the target, record the pair and move both pointers inward.",
      "5. If the sum is less than the target, increment left to increase the value.",
      "6. If the sum is greater than the target, decrement right to decrease the value.",
      "7. Continue until left >= right.",
      "8. All valid pairs have been found in a single linear pass.",
    ],
    worked_example: {
      label: "Find all pairs summing to 9 in arr=[1, 2, 3, 4, 5, 6, 7, 8]",
      steps: [
        "Initial:  left=0(1), right=7(8), sum=9 == 9 → pair (1,8) ✓, left++, right--",
        "Step 2:   left=1(2), right=6(7), sum=9 == 9 → pair (2,7) ✓, left++, right--",
        "Step 3:   left=2(3), right=5(6), sum=9 == 9 → pair (3,6) ✓, left++, right--",
        "Step 4:   left=3(4), right=4(5), sum=9 == 9 → pair (4,5) ✓, left++, right--",
        "Step 5:   left=4 >= right=3 → STOP",
      ],
      result: "Pairs: (1,8), (2,7), (3,6), (4,5) — found in O(n) with zero extra space",
    },
    code: `def two_sum_sorted(arr, target):
    """Return all pairs summing to target in a sorted array."""
    left, right = 0, len(arr) - 1
    pairs = []
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            pairs.append((arr[left], arr[right]))
            left += 1
            right -= 1
        elif s < target:
            left += 1   # need larger value
        else:
            right -= 1  # need smaller value
    return pairs

print(two_sum_sorted([1,2,3,4,5,6,7,8], 9))
# → [(1,8),(2,7),(3,6),(4,5)]`,
    time_complexity: {
      best: "O(n)",
      average: "O(n)",
      worst: "O(n log n)",
      note: "O(n) for the two-pointer scan; O(n log n) if sorting is required first.",
    },
    space_complexity: {
      value: "O(1)",
      note: "Only two integer indices are maintained. Output storage is O(k) where k is the number of results.",
    },
    advantages: [
      "Reduces O(n²) brute-force to O(n) — a massive practical speedup.",
      "O(1) extra space — in-place scan with just two indices.",
      "Intuitive and easy to reason about correctness once sorted order is established.",
      "Generalises naturally to 3Sum (fix one element, run two pointers on the rest).",
    ],
    disadvantages: [
      "Requires sorted input — sorting costs O(n log n) and mutates the array.",
      "Only works on arrays (random-access); linked lists require the fast/slow variant.",
      "The same-direction variant (sliding window style) is less intuitive to set up correctly.",
      "Does not easily extend beyond pairs without careful deduplication logic.",
    ],
    applications: [
      "Two Sum / Three Sum / k-Sum on sorted arrays",
      "Squaring a sorted array (merge from both ends)",
      "Removing duplicates from a sorted array in-place",
      "Valid palindrome check",
      "Trapping rain water",
      "Container with most water",
      "Cycle detection in linked lists (Floyd's algorithm)",
    ],
    common_mistakes: [
      {
        title: "Forgetting to sort the array first",
        description:
          "The greedy step — 'sum too small → move left; sum too large → move right' — is only valid when the array is sorted. On unsorted data the algorithm produces wrong answers silently.",
      },
      {
        title: "Using left <= right instead of left < right",
        description:
          "When left == right both pointers point at the same element. A pair requires two distinct elements, so the loop must stop when left reaches right.",
      },
      {
        title: "Not handling duplicates in results",
        description:
          "For problems like 3Sum where unique triplets are required, you must skip duplicate values after recording a match: while arr[left] == arr[left+1]: left++.",
      },
    ],
    tips: [
      "Always ask: 'Is the array sorted, or can I sort it?' — that determines which variant to use.",
      "For same-direction two pointers (like removing duplicates), use a 'slow' writer and a 'fast' reader.",
      "The fast/slow pointer variant detects cycles in O(n) time and O(1) space — invaluable for linked lists.",
      "Combine with binary search: use binary search to find the complement instead of a second pointer when the array is not sorted but elements can be searched.",
    ],
    fun_fact:
      "Floyd's cycle-detection algorithm (also called the 'tortoise and hare') uses two pointers moving at different speeds and was published by Robert Floyd in 1967. It detects cycles in O(n) time using only two pointers — no visited set — making it the most space-efficient cycle detector known.",
  },

  sliding_window: {
    concept: "Sliding Window",
    tagline: "Reuse previous computation — add one element, remove one element, answer in O(1).",
    introduction:
      "The sliding window technique maintains a contiguous sub-array (or sub-string) of variable or fixed length and updates it incrementally as it moves through the data. Instead of recomputing a property (sum, max, distinct count) from scratch for each window position, it adds the incoming element on the right and removes the outgoing element on the left, achieving O(1) per step. This reduces many O(n·k) brute-force problems to O(n). The technique has two flavours: fixed-size windows (window length is given) and variable-size windows (window expands or contracts to satisfy a constraint). Both appear constantly in competitive programming and interview problems.",
    intuition:
      "Picture a physical sliding magnifying glass over a long strip of numbers. As you slide it one step right, only one number enters on the right and one exits on the left — everything in the middle is unchanged. Instead of re-reading the whole window, you just update your running total. The window slides through the entire strip in linear time, no matter how wide it is.",
    how_it_works: [
      "1. Define the window with two pointers: left = 0, right = 0.",
      "2. Expand the window by moving right and including arr[right] in the window's state.",
      "3. Check whether the current window satisfies the problem's constraint.",
      "4. If the constraint is violated (variable window), shrink from the left: update state, increment left.",
      "5. After shrinking, check if the window is now the best seen so far (record max/min length or value).",
      "6. Continue expanding right until right reaches the end of the array.",
      "7. For fixed-size windows, shrink exactly when right - left + 1 > k.",
      "8. The answer is the best recorded window across all valid positions.",
    ],
    worked_example: {
      label: "Find max sum subarray of length k=3 in arr=[2, 1, 5, 1, 3, 2]",
      steps: [
        "Build initial window: sum = 2+1+5 = 8, window=[2,1,5]",
        "Slide right=3: add arr[3]=1, remove arr[0]=2, sum=8-2+1=7, window=[1,5,1]",
        "Slide right=4: add arr[4]=3, remove arr[1]=1, sum=7-1+3=9, window=[5,1,3]  ← max",
        "Slide right=5: add arr[5]=2, remove arr[2]=5, sum=9-5+2=6, window=[1,3,2]",
        "All positions checked, max_sum=9",
      ],
      result: "Maximum subarray sum of length 3 is 9 (subarray [5,1,3])",
    },
    code: `def max_sum_subarray(arr, k):
    """Maximum sum of any subarray of length k."""
    n = len(arr)
    if n < k:
        return -1
    # Build first window
    window_sum = sum(arr[:k])
    max_sum = window_sum
    for i in range(k, n):
        window_sum += arr[i] - arr[i - k]   # add new, remove old
        max_sum = max(max_sum, window_sum)
    return max_sum

print(max_sum_subarray([2, 1, 5, 1, 3, 2], 3))  # → 9`,
    time_complexity: {
      best: "O(n)",
      average: "O(n)",
      worst: "O(n)",
      note: "Each element is added once and removed once, giving O(2n) = O(n) total operations.",
    },
    space_complexity: {
      value: "O(1) to O(k)",
      note: "O(1) for sum-based windows. O(k) for windows needing a frequency map (e.g., distinct characters).",
    },
    advantages: [
      "Transforms O(n·k) nested-loop solutions into O(n) — huge constant factor savings.",
      "Works for both fixed and variable-size window constraints.",
      "Minimal extra state — usually just a running sum or a small hash map.",
      "Combines naturally with a hash map for character/frequency-based problems.",
    ],
    disadvantages: [
      "Only valid for contiguous subarrays — cannot skip elements.",
      "Variable window variant requires careful thinking about when to shrink.",
      "State management (correctly adding/removing elements) is error-prone for complex constraints.",
      "Does not apply to non-contiguous subsequence problems.",
    ],
    applications: [
      "Maximum/minimum sum subarray of length k",
      "Longest substring without repeating characters",
      "Longest substring with at most k distinct characters",
      "Minimum window substring (anagram matching)",
      "Maximum number of vowels in a substring of length k",
      "Network packet throughput monitoring over time windows",
      "Moving averages in time-series data",
    ],
    common_mistakes: [
      {
        title: "Not handling the edge case n < k",
        description:
          "If the array length is smaller than the window size k, the problem has no answer. Always guard against this at the start.",
      },
      {
        title: "Incorrect shrink condition in variable window",
        description:
          "Shrinking too early or too late causes incorrect window sizes. The shrink loop must run until the window satisfies the constraint again, not just run once.",
      },
      {
        title: "Forgetting to update the frequency map on removal",
        description:
          "When using a hash map to track character counts, decrement the count when the left pointer moves past an element. Forgetting this corrupts all subsequent lookups.",
      },
    ],
    tips: [
      "Template: right expands the window; the inner while loop shrinks from left when constraint is violated.",
      "For 'at most k distinct' problems, use a defaultdict(int) and shrink when len(map) > k.",
      "Fixed window: shrink exactly when right - left + 1 == k (one step per expansion).",
      "Always verify: does the window state correctly represent arr[left..right] after every move?",
    ],
    fun_fact:
      "The sliding window concept is not just algorithmic — it is the foundation of TCP/IP networking. TCP's congestion window is a sliding window over the byte stream, and the receiver's advertised window size controls flow exactly the way a variable sliding window adjusts to constraints.",
  },

  bubble_sort: {
    concept: "Bubble Sort",
    tagline: "Heaviest elements bubble to the top — simple, slow, but a perfect teaching tool.",
    introduction:
      "Bubble sort is a comparison-based sorting algorithm that repeatedly steps through the array, compares adjacent elements, and swaps them if they are in the wrong order. After each complete pass the largest unsorted element has 'bubbled up' to its correct final position at the end. The algorithm needs at most n-1 passes to sort n elements. Although its O(n²) average and worst-case performance makes it impractical for large data, bubble sort is valuable pedagogically — it illustrates comparisons, swaps, loop invariants, and early-termination optimisation in the most transparent way possible. With the early-exit optimisation, it achieves O(n) on already-sorted input.",
    intuition:
      "Imagine a row of numbered boulders. Each round, you walk down the row comparing neighbours: if the left boulder is heavier, you swap them. The heaviest boulder will always reach the end of the row after one full walk, because it wins every comparison it encounters. After k rounds the k heaviest boulders are locked in their correct positions at the right end, and the problem shrinks by one each time.",
    how_it_works: [
      "1. Start from the beginning of the array with pass index i = 0.",
      "2. For each pass, iterate j from 0 to n-i-2 (last i elements are already sorted).",
      "3. Compare arr[j] and arr[j+1]. If arr[j] > arr[j+1], swap them.",
      "4. Track a 'swapped' flag. If no swaps occurred in an entire pass, the array is sorted.",
      "5. Increment pass counter i and repeat from step 2.",
      "6. Stop after n-1 passes or when swapped is False.",
      "7. The array is now sorted in ascending order.",
    ],
    worked_example: {
      label: "Sort arr=[5, 3, 8, 4, 2]",
      steps: [
        "Pass 1: [5,3,8,4,2]→[3,5,8,4,2]→[3,5,8,4,2]→[3,5,4,8,2]→[3,5,4,2,8]  8 locked",
        "Pass 2: [3,5,4,2,8]→[3,5,4,2,8]→[3,4,5,2,8]→[3,4,2,5,8]              5 locked",
        "Pass 3: [3,4,2,5,8]→[3,4,2,5,8]→[3,2,4,5,8]                          4 locked",
        "Pass 4: [3,2,4,5,8]→[2,3,4,5,8]                                       3 locked",
        "Pass 5: no swaps → DONE",
      ],
      result: "[2, 3, 4, 5, 8] — sorted in 4 passes with early-exit check",
    },
    code: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - i - 1):    # last i elements already sorted
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:               # early exit if already sorted
            break
    return arr

print(bubble_sort([5, 3, 8, 4, 2]))  # → [2, 3, 4, 5, 8]`,
    time_complexity: {
      best: "O(n)",
      average: "O(n²)",
      worst: "O(n²)",
      note: "Best case O(n) with early-exit when input is already sorted. Worst is reverse-sorted array.",
    },
    space_complexity: {
      value: "O(1)",
      note: "Sorts in-place using only a temporary variable for swaps. No auxiliary array needed.",
    },
    advantages: [
      "Dead-simple implementation — students can write it from memory.",
      "In-place sort with O(1) extra space.",
      "Stable sort — equal elements preserve their original relative order.",
      "O(n) best case on already-sorted arrays with the swapped flag optimisation.",
    ],
    disadvantages: [
      "O(n²) average and worst case — unusable for n > ~10,000.",
      "Many redundant comparisons even when data is nearly sorted.",
      "Always slower than insertion sort in practice for nearly-sorted data.",
      "Not used in real production sorting code.",
    ],
    applications: [
      "Teaching sorting concepts and loop invariants",
      "Sorting very small arrays (< 10 elements) where simplicity beats performance",
      "Detecting if an array is already sorted (O(n) with early exit)",
      "Embedded systems with severe memory constraints where code size matters",
    ],
    common_mistakes: [
      {
        title: "Inner loop range not reducing each pass",
        description:
          "Writing range(n-1) for the inner loop instead of range(n-i-1) means you compare already-sorted elements every pass. The inner bound must shrink by i each round.",
      },
      {
        title: "Omitting the swapped flag (losing the O(n) best case)",
        description:
          "Without the swapped flag, bubble sort always runs n-1 full passes even on sorted data, making it strictly O(n²) with no best-case benefit.",
      },
    ],
    tips: [
      "Always include the 'swapped' flag — it costs nothing and unlocks O(n) best case.",
      "The outer loop runs n-1 times at most. After pass i, the last i elements are guaranteed sorted.",
      "Cocktail shaker sort is a bidirectional bubble sort — it is faster in practice but still O(n²).",
      "For interview questions, prefer insertion sort as your O(n²) baseline — it's faster in practice.",
    ],
    fun_fact:
      "The name 'bubble sort' was coined in a 1962 paper by Kenneth Iverson. Despite its reputation as a bad algorithm, a 1988 study found it outperforms all other sorting algorithms when the input has exactly one element out of place, because the early-exit makes that single-pass O(n).",
  },

  merge_sort: {
    concept: "Merge Sort",
    tagline: "Divide into halves, sort each, merge in order — guaranteed O(n log n) always.",
    introduction:
      "Merge sort is a stable, divide-and-conquer sorting algorithm that recursively splits an array into two halves, sorts each half, and then merges the two sorted halves into a single sorted array. Its worst-case time complexity is O(n log n), making it asymptotically optimal for comparison-based sorting. The merge step is the heart of the algorithm: it uses two pointers to scan both halves simultaneously, always picking the smaller element next. Unlike quick sort, merge sort's performance does not depend on the input distribution — it is always O(n log n). This predictability makes it the algorithm of choice when guarantees matter, and it is the basis for Python's Timsort.",
    intuition:
      "Think of sorting a deck of cards by splitting it down the middle, giving each half to a friend, and having them sort their halves (recursively). When both friends return sorted halves, you merge them: hold one pile in each hand, and always place the smaller top card into the merged deck. Two sorted sequences can always be merged in one linear pass — that's the key insight.",
    how_it_works: [
      "1. Base case: if the array has 0 or 1 elements, it is already sorted — return it.",
      "2. Divide: find the midpoint mid = len(arr) // 2.",
      "3. Conquer: recursively call merge_sort on arr[:mid] and arr[mid:].",
      "4. At the merge step, maintain two pointers i (left half) and j (right half), both starting at 0.",
      "5. Compare left[i] and right[j]. Append the smaller one to the result and advance that pointer.",
      "6. When one pointer exhausts its half, append all remaining elements from the other half.",
      "7. Return the merged array — it is now fully sorted.",
      "8. The recursion tree has O(log n) levels; each level does O(n) total work, giving O(n log n).",
    ],
    worked_example: {
      label: "Sort arr=[38, 27, 43, 3, 9, 82, 10]",
      steps: [
        "Split:   [38,27,43,3] | [9,82,10]",
        "Split:   [38,27] [43,3] | [9,82] [10]",
        "Split:   [38][27] [43][3] | [9][82] [10]  ← base cases",
        "Merge:   [27,38] [3,43] | [9,82] [10]",
        "Merge:   [3,27,38,43] | [9,10,82]",
        "Merge:   [3,9,10,27,38,43,82]  ← final",
      ],
      result: "[3, 9, 10, 27, 38, 43, 82]",
    },
    code: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left  = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))`,
    time_complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n log n)",
      note: "Guaranteed O(n log n) regardless of input — no worst-case degradation unlike quick sort.",
    },
    space_complexity: {
      value: "O(n)",
      note: "Requires O(n) auxiliary space for the merge step. O(log n) additional stack space for recursion.",
    },
    advantages: [
      "Guaranteed O(n log n) — no bad inputs can degrade it to O(n²).",
      "Stable sort — preserves relative order of equal elements.",
      "Works efficiently on linked lists (no random access needed for merging).",
      "Parallelises trivially — the two halves can be sorted on separate cores.",
    ],
    disadvantages: [
      "O(n) extra space — not suitable for memory-constrained environments.",
      "Slower than quick sort in practice for arrays due to memory allocation overhead.",
      "Not in-place — all standard implementations require an auxiliary array.",
      "For small arrays, insertion sort is faster due to lower overhead.",
    ],
    applications: [
      "Sorting linked lists (preferred over quick sort for linked lists)",
      "External sorting of data too large for RAM (merge passes on disk blocks)",
      "Stable sort requirement in databases and spreadsheets",
      "Counting inversions in an array (classic modification)",
      "Python's Timsort (merge sort hybridised with insertion sort)",
      "Parallel/distributed sorting (map-reduce paradigm)",
    ],
    common_mistakes: [
      {
        title: "Mutating the original array in the merge step",
        description:
          "If you write back into arr instead of a fresh list, you may overwrite elements you haven't read yet. Always merge into a separate result array.",
      },
      {
        title: "Forgetting to append the remaining elements",
        description:
          "After the main while loop ends, one half may still have elements. Failing to extend with left[i:] or right[j:] silently drops elements.",
      },
    ],
    tips: [
      "For an in-place merge sort variant, use a bottom-up iterative approach with an auxiliary buffer.",
      "Timsort (Python's built-in) cuts to insertion sort for subarrays of length < 64 — hybrid approaches beat pure merge sort in practice.",
      "To count inversions: during the merge step, whenever you pick from the right half, add (len(left) - i) to the inversion count.",
      "For linked lists, merge sort is the preferred O(n log n) algorithm because splitting is O(1) (adjust pointers).",
    ],
    fun_fact:
      "Python's built-in sort() and sorted() use Timsort, invented by Tim Peters in 2002. Timsort is essentially merge sort that detects and exploits existing runs (already-sorted sub-sequences) in real data, giving spectacular performance on partially-sorted inputs that are common in practice.",
  },

  quick_sort: {
    concept: "Quick Sort",
    tagline: "Pick a pivot, partition around it — fastest comparison sort in practice.",
    introduction:
      "Quick sort is an in-place, divide-and-conquer sorting algorithm that selects a pivot element and partitions the array into elements less than the pivot and elements greater than the pivot, then recursively sorts each partition. Its average-case time complexity is O(n log n) with a very small constant factor, making it the fastest comparison sort in practice for cache-friendly random-access data. The Lomuto and Hoare partition schemes are the two standard implementations. The main risk is the worst case O(n²) on already-sorted or reverse-sorted input, which is mitigated in production by random pivot selection or the 'median of three' heuristic. Introsort (used in C++ STL) combines quick sort, heap sort, and insertion sort to guarantee O(n log n) worst case.",
    intuition:
      "Imagine sorting a pile of exam papers by grade. Pick one paper at random — that's your pivot. In a single pass, put every paper with a lower grade to the left of the pivot and every paper with a higher grade to the right. The pivot is now in its exact final position. Repeat recursively on each side. After only O(log n) rounds on average, every paper is in its final position — and you never needed extra storage.",
    how_it_works: [
      "1. If the subarray has 0 or 1 elements, return (base case).",
      "2. Choose a pivot — commonly the last element (Lomuto) or a random element (randomised).",
      "3. Partition: rearrange the array so all elements < pivot are left of it and all > pivot are right.",
      "4. Lomuto partition: maintain index i; for each element arr[j] < pivot, swap arr[i] with arr[j] and increment i.",
      "5. After the loop, swap arr[i] with the pivot — pivot is now at its final sorted position.",
      "6. Recursively apply quick_sort to arr[low..pivot-1] and arr[pivot+1..high].",
      "7. No merge step needed — the partition places each pivot in its exact final position.",
      "8. Random pivot selection reduces the probability of worst-case O(n²) to negligible.",
    ],
    worked_example: {
      label: "Sort arr=[3, 6, 8, 10, 1, 2, 1], pivot = last element = 1",
      steps: [
        "Partition around pivot=1: [3,6,8,10,1,2 | 1]",
        "i=-1; j=0: arr[0]=3 >= 1, skip; j=1: 6>=1 skip; ... j=4: arr[4]=1 < 1? No. j=5: arr[5]=2 >= 1 skip",
        "Swap pivot to position i+1=0: [1, 6, 8, 10, 3, 2, 1] — wait, adjust: pivot=1 placed at index 0",
        "Left subarray [] (empty), right subarray [6,8,10,3,2,1]",
        "Recurse on [6,8,10,3,2,1] → pivot=1 → [1,8,10,3,2,6] → ... → [1,2,3,6,8,10]",
        "Final: [1, 1, 2, 3, 6, 8, 10]",
      ],
      result: "[1, 1, 2, 3, 6, 8, 10]",
    },
    code: `import random

def quick_sort(arr, low=0, high=None):
    if high is None:
        high = len(arr) - 1
    if low < high:
        pivot_idx = partition(arr, low, high)
        quick_sort(arr, low, pivot_idx - 1)
        quick_sort(arr, pivot_idx + 1, high)

def partition(arr, low, high):
    # Random pivot to avoid worst-case on sorted input
    rand_idx = random.randint(low, high)
    arr[rand_idx], arr[high] = arr[high], arr[rand_idx]
    pivot = arr[high]
    i = low - 1
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

arr = [3, 6, 8, 10, 1, 2, 1]
quick_sort(arr)
print(arr)  # → [1, 1, 2, 3, 6, 8, 10]`,
    time_complexity: {
      best: "O(n log n)",
      average: "O(n log n)",
      worst: "O(n²)",
      note: "Worst case on sorted/reverse-sorted input with bad pivot choice. Randomised pivot reduces this to near-zero probability.",
    },
    space_complexity: {
      value: "O(log n)",
      note: "In-place partitioning uses O(1) extra data, but the recursion stack uses O(log n) on average and O(n) in the worst case.",
    },
    advantages: [
      "Fastest comparison sort in practice — small constant factors and excellent cache locality.",
      "In-place — O(1) extra data beyond the recursion stack.",
      "Easily randomised to avoid worst-case O(n²) with overwhelming probability.",
      "Tail-call optimisable to reduce stack depth to O(log n).",
    ],
    disadvantages: [
      "Worst-case O(n²) without randomisation (e.g., sorted input with last-element pivot).",
      "Not stable — relative order of equal elements is not preserved.",
      "Recursive — deep recursion on large inputs can overflow the stack without tail-call optimisation.",
      "Complex to implement correctly compared to merge sort.",
    ],
    applications: [
      "Default sort in C++ STL (as part of Introsort)",
      "Java's Arrays.sort for primitive types",
      "In-memory sorting of large datasets",
      "Selection algorithms (quick select finds kth smallest in O(n) average)",
      "Numerical libraries requiring fast in-place sorting",
    ],
    common_mistakes: [
      {
        title: "Always using the last element as pivot on sorted input",
        description:
          "On an already-sorted array with last-element pivot, every partition produces an empty left half and an n-1 right half, giving O(n²). Always randomise the pivot or use median-of-three.",
      },
      {
        title: "Off-by-one in the partition boundary",
        description:
          "Returning the wrong pivot index causes one recursive call to include the pivot itself, leading to infinite recursion or incorrect results. The pivot must be at its final sorted position and excluded from both recursive calls.",
      },
    ],
    tips: [
      "Always randomise the pivot — swap a random element to the last position before partitioning.",
      "Use insertion sort for subarrays of length < ~10; the crossover is well-studied.",
      "Hoare partition (two pointers scanning inward) is generally faster than Lomuto but trickier to implement.",
      "Introsort (Python's cPython uses Timsort; C++ uses Introsort) switches to heap sort when recursion depth exceeds 2·log n to guarantee O(n log n) worst case.",
    ],
    fun_fact:
      "Quick sort was invented by Tony Hoare in 1959 while he was a student on a British Council exchange visit to Moscow State University, trying to sort words for a machine translation project. He later described it as 'the most elegant and simplest piece of code I ever wrote.' The algorithm turned 65 in 2024 and is still the dominant sorting algorithm in most standard libraries.",
  },

  linked_list: {
    concept: "Linked List",
    tagline: "Dynamic chain of nodes — O(1) insert/delete anywhere, O(n) random access.",
    introduction:
      "A linked list is a linear data structure in which each element (node) contains a value and a pointer to the next node, forming a chain. Unlike arrays, linked lists do not require contiguous memory — nodes can be scattered anywhere in the heap, connected only by pointers. This makes insertion and deletion at a known position O(1) by re-linking pointers, but random access O(n) because there is no index arithmetic. Singly linked lists point only forward; doubly linked lists add a backward pointer enabling O(1) bidirectional traversal. Linked lists underpin many higher-level structures: stacks, queues, hash table buckets (chaining), and the undo history in text editors.",
    intuition:
      "Think of a treasure hunt where each clue tells you the location of the next clue. You can only find clue k by starting from clue 1 and following the chain. But you can insert a new clue between clue 3 and clue 4 by simply rewriting two pieces of paper — no need to shift every other clue in the treasure hunt. That is the essence of a linked list: fast insertion by pointer rewiring, slow random access.",
    how_it_works: [
      "1. Each node is an object with a val field and a next pointer (and prev for doubly linked).",
      "2. The list is identified by its head pointer — the first node. An empty list has head = None.",
      "3. Traversal: start at head, follow next pointers until next == None (the tail).",
      "4. Insert at head: create new node, set new.next = head, update head = new node. O(1).",
      "5. Insert after a given node p: new.next = p.next, p.next = new. O(1) once p is known.",
      "6. Delete a node: find its predecessor prev, set prev.next = target.next. O(1) once prev is known.",
      "7. Search: traverse from head comparing values — O(n) worst case.",
      "8. Maintain a tail pointer if O(1) append is needed (common in queue implementations).",
    ],
    worked_example: {
      label: "Insert 15 after node 10 in list: 5 → 10 → 20 → None",
      steps: [
        "Initial list: head→[5|•]→[10|•]→[20|None]",
        "Traverse to find node with val=10: curr = head.next (curr.val=10)",
        "Create new node: new = Node(15), new.next = None",
        "Rewire: new.next = curr.next  →  new.next points to [20|None]",
        "Rewire: curr.next = new       →  [10|•] now points to [15|•]",
        "Final:  head→[5|•]→[10|•]→[15|•]→[20|None]",
      ],
      result: "5 → 10 → 15 → 20 → None (2 pointer rewires, O(1) once position is known)",
    },
    code: `class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

class LinkedList:
    def __init__(self): self.head = None

    def append(self, val):          # O(n)
        node = Node(val)
        if not self.head:
            self.head = node; return
        curr = self.head
        while curr.next: curr = curr.next
        curr.next = node

    def delete(self, val):          # O(n) search, O(1) delete
        dummy = Node(0); dummy.next = self.head
        prev = dummy
        while prev.next:
            if prev.next.val == val:
                prev.next = prev.next.next; break
            prev = prev.next
        self.head = dummy.next

    def to_list(self):
        res, curr = [], self.head
        while curr: res.append(curr.val); curr = curr.next
        return res`,
    time_complexity: {
      best: "O(1)",
      average: "O(n)",
      worst: "O(n)",
      note: "Insert/delete at known position O(1); search and access by index O(n); append O(n) without tail pointer.",
    },
    space_complexity: {
      value: "O(n)",
      note: "Each node stores value + pointer(s). Overhead is 8–16 bytes per node for pointers (more than arrays).",
    },
    advantages: [
      "Dynamic size — grows and shrinks without reallocation.",
      "O(1) insert and delete at a known node — no shifting of elements.",
      "No wasted capacity — allocates exactly what is needed.",
      "Doubly linked list allows O(1) forward and backward traversal.",
    ],
    disadvantages: [
      "O(n) random access — no index arithmetic like arrays.",
      "Extra memory per node for pointer(s) — higher overhead than arrays.",
      "Poor cache performance — nodes are scattered in heap memory.",
      "No binary search — must traverse from head to find any element.",
    ],
    applications: [
      "Implementing stacks and queues",
      "Hash table collision chaining",
      "Undo/redo history in editors (doubly linked)",
      "Music player playlist (next/prev track)",
      "LRU cache (doubly linked + hash map)",
      "OS ready-queue and I/O request queues",
      "Polynomial arithmetic in symbolic math",
    ],
    common_mistakes: [
      {
        title: "Losing the head pointer during deletion",
        description:
          "When deleting the head node, always update self.head = self.head.next before returning. Failing to do so leaves the list pointing to the deleted node.",
      },
      {
        title: "Not handling the None (empty) case",
        description:
          "Operations like insert-after or delete must handle the case where head is None or the target node doesn't exist. Always check for None before dereferencing .next.",
      },
      {
        title: "Forgetting the dummy (sentinel) node trick",
        description:
          "Deletion without a dummy head requires special-casing 'delete the head'. Using a dummy node before head unifies all cases into the same prev.next = prev.next.next logic.",
      },
    ],
    tips: [
      "Use a dummy head node — it eliminates special cases for head deletion and empty-list handling.",
      "Two-pointer techniques (fast/slow) are essential: find middle in one pass, detect cycles, find nth-from-end.",
      "Reverse a linked list iteratively with three pointers: prev, curr, next_node — O(n) time, O(1) space.",
      "For LRU cache: doubly linked list + hash map gives O(1) get and O(1) put.",
    ],
    fun_fact:
      "The doubly linked list that powers Python's collections.deque was one of the driving forces behind Python's fast deque operations. CPython actually implements deque as a doubly linked list of fixed-size blocks (64 elements each), combining pointer efficiency with cache locality — it achieves O(1) append and popleft, which list can't match.",
  },

  hash_map: {
    concept: "Hash Map",
    tagline: "O(1) average get, set, delete — the most versatile data structure in competitive programming.",
    introduction:
      "A hash map (also called hash table or dictionary) is a data structure that maps keys to values using a hash function. The hash function converts a key into an integer index into an underlying array (bucket array). Collisions — when two keys hash to the same index — are handled by chaining (linked list at each bucket) or open addressing (probe for the next empty slot). Under a good hash function and a reasonable load factor (< 0.75), all three core operations — get, put, delete — run in O(1) amortised time. Hash maps are arguably the most important data structure for practical algorithm design and are used everywhere from language runtimes to database query optimisers.",
    intuition:
      "Think of a library with 1000 shelves numbered 0–999. When you add a book, a librarian computes a 3-digit code from the book's title (the hash) and places it on that shelf. To retrieve it, compute the same code and go directly to that shelf — no searching, no browsing. If two books share a shelf (collision), they form a small stack on that shelf. As long as the stacks stay short (low load factor), every operation is O(1).",
    how_it_works: [
      "1. Allocate a bucket array of size m (typically a prime number for better distribution).",
      "2. To insert key k with value v: compute index = hash(k) % m.",
      "3. Go to bucket[index]. If using chaining, append (k, v) to the linked list there.",
      "4. To look up key k: compute index = hash(k) % m, then scan bucket[index]'s list for key k.",
      "5. To delete key k: find it in bucket[index]'s list and remove the node.",
      "6. Track load factor = n/m (number of entries / bucket count).",
      "7. When load factor exceeds threshold (~0.75), resize: allocate 2m buckets and rehash all entries.",
      "8. Rehashing is O(n) but happens so rarely that amortised cost per operation stays O(1).",
    ],
    worked_example: {
      label: "Insert keys [apple, banana, cherry] into a hash map with 5 buckets",
      steps: [
        "hash('apple') % 5 = 2 → bucket[2]: [(apple, 1)]",
        "hash('banana') % 5 = 3 → bucket[3]: [(banana, 2)]",
        "hash('cherry') % 5 = 2 → COLLISION! bucket[2]: [(apple,1),(cherry,3)]",
        "Lookup 'cherry': hash%5=2 → scan bucket[2] → find cherry at position 1 in chain → O(1) avg",
        "Load factor = 3/5 = 0.6 < 0.75, no resize needed",
      ],
      result: "All 3 keys stored; 'cherry' uses chaining at bucket 2",
    },
    code: `# Python's dict is a hash map. Here's a minimal open-addressing version:
class HashMap:
    def __init__(self, size=16):
        self.size = size
        self.table = [None] * size

    def _hash(self, key):
        return hash(key) % self.size

    def put(self, key, value):
        idx = self._hash(key)
        while self.table[idx] is not None:
            if self.table[idx][0] == key:
                self.table[idx] = (key, value); return
            idx = (idx + 1) % self.size        # linear probe
        self.table[idx] = (key, value)

    def get(self, key):
        idx = self._hash(key)
        while self.table[idx] is not None:
            if self.table[idx][0] == key:
                return self.table[idx][1]
            idx = (idx + 1) % self.size
        return None

hm = HashMap()
hm.put("name", "Alice")
print(hm.get("name"))  # → Alice`,
    time_complexity: {
      best: "O(1)",
      average: "O(1)",
      worst: "O(n)",
      note: "Worst case O(n) when all keys collide (pathological hash or adversarial input). Average O(1) under good hash function.",
    },
    space_complexity: {
      value: "O(n)",
      note: "Stores n key-value pairs plus m bucket slots. With load factor 0.75, roughly 1.33n slots are allocated.",
    },
    advantages: [
      "O(1) average get, put, delete — fastest lookup structure for arbitrary keys.",
      "Flexible keys — any hashable type (string, integer, tuple) can be a key.",
      "Constant-time frequency counting and membership testing.",
      "Foundation for sets, caches, and memoisation.",
    ],
    disadvantages: [
      "O(n) worst case with poor hash function or adversarial keys.",
      "No ordering — iterating over keys does not give sorted order.",
      "Higher memory overhead than arrays (bucket array + pointer overhead).",
      "Hash collisions degrade performance; pathological inputs can trigger O(n) behaviour.",
    ],
    applications: [
      "Frequency counting in O(n)",
      "Two-Sum and its variants (complement lookup)",
      "Memoisation / dynamic programming caching",
      "Anagram and substring matching",
      "Graph adjacency list representation",
      "Database index and query-plan caching",
      "Deduplification of large datasets",
    ],
    common_mistakes: [
      {
        title: "Using mutable types as keys",
        description:
          "Lists, sets, and dicts are not hashable in Python — using them as keys raises TypeError. Use tuples instead of lists when a composite key is needed.",
      },
      {
        title: "Counting with a raw dict instead of defaultdict",
        description:
          "Accessing a missing key in a plain dict raises KeyError. Use collections.defaultdict(int) or dict.get(key, 0) to safely increment counts.",
      },
      {
        title: "Modifying a dict while iterating over it",
        description:
          "Changing the size of a dictionary during iteration raises RuntimeError in Python. Collect keys to delete first, then remove them in a separate loop.",
      },
    ],
    tips: [
      "Use collections.Counter for frequency counting — it's a hash map subclass with built-in count utilities.",
      "For 'find if two strings are anagrams': compare Counter(s) == Counter(t) — O(n).",
      "Sliding window + hash map: track character frequencies in the current window using a dict.",
      "When the key is an integer in range [0, n), consider an array instead of a hash map for better cache performance.",
    ],
    fun_fact:
      "Python's dict was redesigned in CPython 3.6 to preserve insertion order as an implementation detail (made official in 3.7). The redesign also reduced memory usage by up to 25% by splitting the compact entry array from the index hash table. In Python 3.6+, dict.keys() returns keys in the order they were inserted — a property not guaranteed by hash maps in most other languages.",
  },

  stack_queue: {
    concept: "Stack & Queue",
    tagline: "LIFO and FIFO — two disciplines of access that power parsers, BFS, and undo systems.",
    introduction:
      "A stack is a Last-In-First-Out (LIFO) data structure where elements are pushed onto and popped from the same end (the top). A queue is a First-In-First-Out (FIFO) structure where elements are enqueued at the rear and dequeued from the front. Both are abstract data types implementable with arrays or linked lists, each with O(1) push/enqueue and pop/dequeue. Stacks model function call frames, expression parsing, and depth-first search. Queues model scheduling, breadth-first search, and buffered I/O. A deque (double-ended queue) generalises both: it allows O(1) operations at either end, making it the basis for sliding window maximum and palindrome checking.",
    intuition:
      "A stack is a stack of plates: you always add and remove from the top — the last plate placed is the first removed (LIFO). A queue is a checkout line: the first person who joined is the first to be served — you join at the back and leave from the front (FIFO). Both structures enforce a strict discipline that turns out to be exactly what many algorithms need.",
    how_it_works: [
      "1. Stack push: append element to the top (end of array or head of linked list). O(1).",
      "2. Stack pop: remove and return the top element. Raise error if empty. O(1).",
      "3. Stack peek: return top element without removing it. O(1).",
      "4. Queue enqueue: append element to the rear (end of array or tail of linked list). O(1).",
      "5. Queue dequeue: remove and return the front element. O(1) with a deque or linked list; O(n) with a plain list (avoid!).",
      "6. Both structures maintain a size counter for O(1) length queries.",
      "7. Use Python's list as a stack (append/pop). Use collections.deque for a queue (append/popleft).",
      "8. A monotone stack tracks a decreasing (or increasing) sequence, discarding dominated elements.",
    ],
    worked_example: {
      label: "Validate balanced parentheses: s = '([{}])'",
      steps: [
        "stack=[], process '(' → push  → stack=['(']",
        "stack=['('], process '[' → push  → stack=['(','[']",
        "stack=['(','['], process '{' → push  → stack=['(','[','{']",
        "stack=['(','[','{'], process '}' → pop '{', matches → stack=['(','[']",
        "stack=['(','['], process ']' → pop '[', matches → stack=['(']",
        "stack=['('], process ')' → pop '(', matches → stack=[]",
        "Loop ends, stack is empty → VALID",
      ],
      result: "Stack empty at end → string is valid. O(n) time, O(n) space.",
    },
    code: `from collections import deque

# Stack (LIFO)
stack = []
stack.append(1)   # push
stack.append(2)
print(stack.pop()) # → 2 (LIFO)

# Queue (FIFO) — use deque for O(1) popleft
queue = deque()
queue.append(1)    # enqueue
queue.append(2)
print(queue.popleft())  # → 1 (FIFO)

# Balanced parentheses validator
def is_valid(s):
    stack, match = [], {')':'(', ']':'[', '}':'{'}
    for ch in s:
        if ch in '([{':
            stack.append(ch)
        elif ch in ')]}':
            if not stack or stack[-1] != match[ch]:
                return False
            stack.pop()
    return len(stack) == 0

print(is_valid("([{}])"))  # → True`,
    time_complexity: {
      best: "O(1)",
      average: "O(1)",
      worst: "O(1)",
      note: "All core operations (push, pop, enqueue, dequeue, peek) are O(1) with proper implementation.",
    },
    space_complexity: {
      value: "O(n)",
      note: "Both store n elements. Python list has amortised O(1) append; deque has O(1) both ends.",
    },
    advantages: [
      "O(1) operations at the access end — extremely fast.",
      "Simple, well-understood interface — easy to reason about correctness.",
      "Stacks provide natural recursion simulation (explicit call stack).",
      "Queues are the natural data structure for BFS level-order processing.",
    ],
    disadvantages: [
      "Limited access — only top/front element is accessible in O(1).",
      "Python list.pop(0) is O(n) — use deque.popleft() instead for queues.",
      "Stacks can overflow if unbounded recursion or input is pathological.",
      "No random access to middle elements.",
    ],
    applications: [
      "Function call stack (every programming language runtime)",
      "Undo/redo in editors (stack of states)",
      "Expression evaluation and syntax parsing",
      "BFS graph traversal (queue)",
      "Level-order tree traversal",
      "Monotone stack for next-greater-element problems",
      "Browser history back/forward (stack)",
    ],
    common_mistakes: [
      {
        title: "Using list.pop(0) as a queue in Python",
        description:
          "list.pop(0) shifts all elements left — it is O(n). For queue semantics, always use collections.deque and its popleft() method which is O(1).",
      },
      {
        title: "Not checking for empty stack before pop",
        description:
          "Calling stack.pop() on an empty list raises IndexError. Always guard with if stack: before popping, or handle the exception explicitly.",
      },
    ],
    tips: [
      "Monotone stack pattern: for 'next greater element', push indices; whenever you see a larger element, pop and record the answer for all popped indices.",
      "Implement a queue using two stacks: enqueue to stack1; dequeue reverses stack1 into stack2 lazily — O(1) amortised.",
      "Use a stack to convert recursive DFS to iterative — push children in reverse order so the leftmost is processed first.",
      "deque from collections is the Swiss-army knife: O(1) at both ends, works as both stack and queue.",
    ],
    fun_fact:
      "The call stack that powers every function call in every programming language is a stack data structure maintained by the CPU hardware. When you trigger a stack overflow error, you have literally exhausted the memory allocated for the program's call stack — typically 1–8 MB. Languages like Python set a recursion limit (default 1000) precisely to catch stack overflows before the OS kills the process.",
  },

  binary_tree: {
    concept: "Binary Tree",
    tagline: "Hierarchical structure where each node has at most two children — recursive by nature.",
    introduction:
      "A binary tree is a hierarchical data structure where each node contains a value and has at most two children: a left child and a right child. Trees model hierarchical relationships naturally — file systems, HTML DOM, organisational charts, and expression syntax all form trees. Binary trees are the simplest tree variant and the foundation for more specialised structures: binary search trees (BST), heaps, AVL trees, and red-black trees. The most important property of binary trees is that most operations — traversal, search, insert — decompose recursively into the same problem on a smaller tree, making recursion the natural implementation strategy. Binary trees are also the substrate for segment trees and Fenwick trees used in competitive programming.",
    intuition:
      "Think of a corporate org chart: the CEO is the root, each manager has at most two direct reports, and the hierarchy fans out downward. To visit every employee, you can go depth-first (follow one branch all the way down before backtracking) or breadth-first (visit all people at each management level before going deeper). The tree's recursive structure means every subtree looks exactly like the whole tree — just smaller.",
    how_it_works: [
      "1. Each node has: val, left (child node or None), right (child node or None).",
      "2. Inorder traversal (left → root → right): for a BST, this yields elements in sorted order.",
      "3. Preorder traversal (root → left → right): useful for copying or serialising a tree.",
      "4. Postorder traversal (left → right → root): useful for deletion and computing subtree properties.",
      "5. Level-order (BFS) traversal: use a queue; enqueue root, then repeatedly dequeue and enqueue children.",
      "6. Height of a tree: 1 + max(height(left), height(right)); height of None = 0.",
      "7. A balanced binary tree has height O(log n); a degenerate tree (linked list shape) has height O(n).",
      "8. Binary Search Tree (BST) property: all nodes in left subtree < root < all nodes in right subtree.",
    ],
    worked_example: {
      label: "Inorder, preorder, postorder traversal of tree rooted at 4 [left=2(1,3), right=6(5,7)]",
      steps: [
        "Tree structure:       4",
        "                     / \\",
        "                    2   6",
        "                   / \\ / \\",
        "                  1  3 5  7",
        "Inorder   (L→R→root): 1, 2, 3, 4, 5, 6, 7  ← sorted order",
        "Preorder  (root→L→R): 4, 2, 1, 3, 6, 5, 7",
        "Postorder (L→R→root): 1, 3, 2, 5, 7, 6, 4",
      ],
      result: "Inorder traversal of BST always produces sorted output",
    },
    code: `class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def inorder(root):      # L → root → R
    if root is None: return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def height(root):
    if root is None: return 0
    return 1 + max(height(root.left), height(root.right))

# Build example tree
root = TreeNode(4,
    TreeNode(2, TreeNode(1), TreeNode(3)),
    TreeNode(6, TreeNode(5), TreeNode(7)))

print(inorder(root))    # → [1, 2, 3, 4, 5, 6, 7]
print(height(root))     # → 3`,
    time_complexity: {
      best: "O(log n)",
      average: "O(log n)",
      worst: "O(n)",
      note: "O(log n) for balanced trees; O(n) for degenerate (skewed) trees. Full traversal is always O(n).",
    },
    space_complexity: {
      value: "O(n)",
      note: "O(n) to store n nodes. Traversal recursion uses O(h) stack space where h is the height.",
    },
    advantages: [
      "Natural recursive structure makes many problems elegant to solve.",
      "BST gives O(log n) search, insert, delete when balanced.",
      "Hierarchical data modelling — file systems, XML/HTML, AST.",
      "Heaps (complete binary trees) give O(log n) priority queue operations.",
    ],
    disadvantages: [
      "Can degenerate to O(n) height (linked-list shape) with sorted insertions in a plain BST.",
      "No O(1) random access — must traverse from root.",
      "Balancing (AVL, Red-Black) adds significant implementation complexity.",
      "Pointer overhead — each node stores two pointers in addition to its value.",
    ],
    applications: [
      "Binary Search Trees for ordered sets and maps",
      "Heap (priority queue) implementation",
      "Expression trees in compilers and calculators",
      "Huffman encoding trees for data compression",
      "Segment trees and Fenwick trees for range queries",
      "XML/HTML/JSON document object model",
      "Game decision trees (minimax algorithm)",
    ],
    common_mistakes: [
      {
        title: "Confusing inorder/preorder/postorder output",
        description:
          "A BST's inorder traversal is sorted, but preorder and postorder are not. Memorise: inorder = L-N-R = sorted for BST.",
      },
      {
        title: "Not handling the None base case in recursion",
        description:
          "Every tree recursion must check if root is None before accessing root.val or root.left. A missing base case causes AttributeError on leaf node children.",
      },
    ],
    tips: [
      "Morris traversal achieves O(n) inorder traversal with O(1) extra space by temporarily threading the tree.",
      "Iterative inorder using an explicit stack: push all left children, then process nodes as you pop and push right subtrees.",
      "For 'lowest common ancestor', use the recursive property: if root is between p and q (in a BST), root is the LCA.",
      "Check if a tree is balanced: compute height and check |height(left) - height(right)| <= 1 at every node.",
    ],
    fun_fact:
      "The maximum number of nodes in a binary tree of height h is 2^(h+1) - 1. A perfect binary tree with height 20 holds over 2 million nodes. This exponential capacity is why balanced BSTs achieve O(log n) performance — doubling the data adds only one level to the tree.",
  },

  bfs: {
    concept: "Breadth-First Search (BFS)",
    tagline: "Visit all neighbours before going deeper — the shortest path algorithm for unweighted graphs.",
    introduction:
      "Breadth-First Search (BFS) is a graph and tree traversal algorithm that explores all vertices at the current depth (distance from source) before moving to vertices at the next depth level. It uses a queue (FIFO) to ensure this level-by-level order. BFS guarantees that the first time a vertex is reached, it is reached via the shortest path (fewest edges) from the source — this property makes BFS the foundation of shortest-path algorithms in unweighted graphs. BFS runs in O(V + E) time where V is vertices and E is edges, since every vertex and edge is processed exactly once. It also forms the basis for many specialised algorithms: bipartiteness checking, connected components, and multi-source shortest paths.",
    intuition:
      "Drop a pebble in a still pond and watch the ripples spread outward in concentric circles. The ripple at radius 1 is all vertices 1 hop away; radius 2 is all vertices 2 hops away, and so on. BFS is exactly this ripple: it visits nodes in order of their distance from the source, ensuring that when you first reach any node, you've taken the shortest possible route. The queue is the ripple — it holds all nodes at the current frontier while you generate the next frontier.",
    how_it_works: [
      "1. Mark source vertex as visited and enqueue it.",
      "2. While the queue is non-empty, dequeue a vertex u.",
      "3. Process u (record distance, parent, or simply visit it).",
      "4. For each unvisited neighbour v of u: mark v visited, enqueue v.",
      "5. The distance of v from source = distance of u + 1.",
      "6. Repeat until queue is empty — all reachable vertices have been visited.",
      "7. Vertices never in the queue were unreachable from the source.",
      "8. To reconstruct shortest path, store parent[v] = u when v is first reached.",
    ],
    worked_example: {
      label: "BFS from vertex 0 in graph: 0-[1,2], 1-[0,3,4], 2-[0,5], 3-[1], 4-[1], 5-[2]",
      steps: [
        "Init:    visited={0}, queue=[0], dist={0:0}",
        "Pop 0:   neighbours 1,2 → visit both; dist={0:0,1:1,2:1}, queue=[1,2]",
        "Pop 1:   neighbours 0(seen),3,4 → visit 3,4; dist adds 3:2,4:2, queue=[2,3,4]",
        "Pop 2:   neighbours 0(seen),5 → visit 5; dist adds 5:2, queue=[3,4,5]",
        "Pop 3:   neighbours 1(seen) → queue=[4,5]",
        "Pop 4:   neighbours 1(seen) → queue=[5]",
        "Pop 5:   neighbours 2(seen) → queue=[] DONE",
      ],
      result: "Distances from 0: {0:0, 1:1, 2:1, 3:2, 4:2, 5:2}",
    },
    code: `from collections import deque

def bfs(graph, start):
    visited = {start}
    queue = deque([start])
    dist = {start: 0}
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbour in graph[node]:
            if neighbour not in visited:
                visited.add(neighbour)
                dist[neighbour] = dist[node] + 1
                queue.append(neighbour)
    return order, dist

graph = {0:[1,2], 1:[0,3,4], 2:[0,5], 3:[1], 4:[1], 5:[2]}
order, dist = bfs(graph, 0)
print(order)  # → [0, 1, 2, 3, 4, 5]
print(dist)   # → {0:0, 1:1, 2:1, 3:2, 4:2, 5:2}`,
    time_complexity: {
      best: "O(V + E)",
      average: "O(V + E)",
      worst: "O(V + E)",
      note: "Every vertex is enqueued once (O(V)) and every edge is examined once (O(E)). Total O(V+E).",
    },
    space_complexity: {
      value: "O(V)",
      note: "Queue holds at most O(V) vertices at once. Visited set and distance map also O(V).",
    },
    advantages: [
      "Finds shortest path (fewest edges) in unweighted graphs — guaranteed.",
      "Systematically explores all reachable vertices.",
      "Natural level-order traversal for trees.",
      "Can detect bipartiteness and connected components.",
    ],
    disadvantages: [
      "Uses O(V) queue memory — can be large for wide graphs.",
      "Does not handle weighted edges — use Dijkstra's for weighted shortest paths.",
      "Slower than DFS for problems that only require reachability or need to go deep.",
    ],
    applications: [
      "Shortest path in unweighted graphs",
      "Level-order tree traversal",
      "Web crawlers (explore pages level by level)",
      "Social network friend-of-friend distance",
      "Multi-source BFS (find nearest exit in a maze)",
      "Word ladder / transformation sequence problems",
      "Checking if a graph is bipartite",
    ],
    common_mistakes: [
      {
        title: "Marking vertices visited when dequeued instead of when enqueued",
        description:
          "If you mark a vertex visited only when you dequeue it, the same vertex can be enqueued multiple times before being processed — causing O(V²) performance on dense graphs. Always mark visited when enqueuing.",
      },
      {
        title: "Using a list and list.pop(0) instead of deque.popleft()",
        description:
          "list.pop(0) is O(n), turning the overall BFS from O(V+E) to O(V²). Always use collections.deque for the queue.",
      },
    ],
    tips: [
      "For multi-source BFS: add all sources to the queue initially with distance 0 — BFS naturally handles it.",
      "Bidirectional BFS: run BFS from both source and target simultaneously, stopping when frontiers meet — reduces search space from O(b^d) to O(b^(d/2)).",
      "0-1 BFS: use a deque; push 0-weight edges to front, 1-weight edges to back — gives O(V+E) shortest path for 0-1 weighted graphs.",
    ],
    fun_fact:
      "BFS was used by Konrad Zuse in 1945 to traverse plankalkül data structures — arguably the first graph search algorithm. It was later independently described by Edward Moore in 1959 for finding shortest paths through mazes, and by C.Y. Lee in 1961 for routing printed circuit board connections — a problem still solved by BFS in EDA tools today.",
  },

  dfs: {
    concept: "Depth-First Search (DFS)",
    tagline: "Go as deep as possible first, then backtrack — the backbone of cycle detection and topological sort.",
    introduction:
      "Depth-First Search (DFS) explores a graph by going as far along each branch as possible before backtracking. It uses a stack — either the call stack (recursive) or an explicit stack (iterative). DFS runs in O(V + E) just like BFS, but it explores the structure very differently: it finds paths (not necessarily shortest), detects cycles, computes connected components, and generates topological orderings. The three standard tree traversals — preorder, inorder, postorder — are all DFS variants. DFS is also the foundation for Tarjan's strongly connected components algorithm and Kosaraju's algorithm. For tree problems, DFS is almost always the right tool because trees have no cycles.",
    intuition:
      "Imagine exploring a cave system. You always take the first unexplored tunnel you find and keep going deeper. When you hit a dead end, you backtrack to the last junction and try the next unexplored tunnel. You explore the entire cave without missing a single passage — but your path is deep and winding, not a neat outward ripple like BFS. The call stack literally maintains your 'trail of breadcrumbs' back to each junction.",
    how_it_works: [
      "1. Mark start vertex as visited.",
      "2. Process the vertex (preorder action happens here).",
      "3. For each unvisited neighbour v: recursively call DFS(v).",
      "4. After all neighbours are processed, take any postorder action (e.g., push to result stack for topological sort).",
      "5. In the iterative version: push start to stack; while stack non-empty, pop vertex u, mark visited, push all unvisited neighbours.",
      "6. Cycle detection: track vertices in the current recursion path ('grey' set). If you reach a grey vertex, a cycle exists.",
      "7. Topological sort: reverse the postorder finish times of all vertices.",
      "8. For forests (disconnected graphs), run DFS from every unvisited vertex.",
    ],
    worked_example: {
      label: "DFS from vertex 0 in graph: 0-[1,2], 1-[0,3], 2-[0,4], 3-[1], 4-[2]",
      steps: [
        "DFS(0): visit 0, explore neighbour 1",
        "  DFS(1): visit 1, explore neighbour 0 (seen), explore neighbour 3",
        "    DFS(3): visit 3, explore neighbour 1 (seen) → backtrack",
        "  DFS(1) done → backtrack to 0, explore neighbour 2",
        "  DFS(2): visit 2, explore neighbour 0 (seen), explore neighbour 4",
        "    DFS(4): visit 4, explore neighbour 2 (seen) → backtrack",
        "  DFS(2) done → DFS(0) done",
        "Traversal order: [0, 1, 3, 2, 4]",
      ],
      result: "DFS visit order: [0, 1, 3, 2, 4] (depth-first, not level-by-level)",
    },
    code: `def dfs_recursive(graph, node, visited=None, order=None):
    if visited is None: visited = set()
    if order is None:   order = []
    visited.add(node)
    order.append(node)
    for neighbour in graph[node]:
        if neighbour not in visited:
            dfs_recursive(graph, neighbour, visited, order)
    return order

def dfs_iterative(graph, start):
    visited, stack, order = set(), [start], []
    while stack:
        node = stack.pop()
        if node in visited: continue
        visited.add(node)
        order.append(node)
        for n in reversed(graph[node]):   # reversed for left-to-right order
            if n not in visited:
                stack.append(n)
    return order

graph = {0:[1,2], 1:[0,3], 2:[0,4], 3:[1], 4:[2]}
print(dfs_recursive(graph, 0))   # → [0, 1, 3, 2, 4]`,
    time_complexity: {
      best: "O(V + E)",
      average: "O(V + E)",
      worst: "O(V + E)",
      note: "Each vertex is visited once (O(V)) and each edge is traversed once (O(E)). Total O(V+E).",
    },
    space_complexity: {
      value: "O(V)",
      note: "Recursion stack (or explicit stack) holds at most O(V) frames. Visited set is O(V).",
    },
    advantages: [
      "Natural for tree and recursive structures — follows the recursive definition.",
      "Less memory than BFS for deep, narrow graphs — stack holds only the current path.",
      "Detects cycles, computes topological sorts, and finds SCCs.",
      "Preorder/inorder/postorder variations handle a huge range of tree problems.",
    ],
    disadvantages: [
      "Does not find shortest paths in unweighted graphs (BFS does).",
      "Recursive DFS can overflow the call stack on deep graphs (Python default: 1000 frames).",
      "Postorder-based topological sort requires extra care with cycle detection.",
    ],
    applications: [
      "Topological sorting of DAGs (build systems, package dependency resolution)",
      "Cycle detection in directed graphs",
      "Strongly connected components (Tarjan's, Kosaraju's)",
      "Maze generation and solving",
      "All tree traversals (inorder, preorder, postorder)",
      "Generating permutations and combinations (backtracking)",
      "Finding articulation points and bridges",
    ],
    common_mistakes: [
      {
        title: "Missing visited set in graph DFS (infinite loop)",
        description:
          "Without tracking visited vertices, DFS loops forever in graphs with cycles. Always maintain a visited set. (For trees this is not needed since there are no cycles.)",
      },
      {
        title: "Confusing DFS visit order with topological order",
        description:
          "DFS visit order is NOT topological order. Topological order requires recording finish times (postorder) and reversing them.",
      },
    ],
    tips: [
      "Python's recursion limit is 1000. For deep DFS on graphs, either increase sys.setrecursionlimit or use an iterative stack.",
      "Backtracking IS DFS: at each recursive call, make a choice; when all choices are exhausted, undo the last choice (backtrack) and try the next one.",
      "For cycle detection in a directed graph: maintain a 'currently in stack' set (grey nodes) — if you reach a grey node, you've found a back edge and thus a cycle.",
      "Iterative DFS with explicit stack visits nodes in a slightly different order than recursive DFS — if exact order matters, use reversed() when pushing neighbours.",
    ],
    fun_fact:
      "Tarjan's SCC algorithm (1972) runs DFS once and finds all strongly connected components in O(V+E) — it is considered one of the most elegant graph algorithms ever devised. Robert Tarjan also invented splay trees, link-cut trees, and the union-find data structure, making him one of the most prolific algorithm inventors in computer science history.",
  },

  fibonacci_dp: {
    concept: "Dynamic Programming — Fibonacci",
    tagline: "Store what you compute — never solve the same subproblem twice.",
    introduction:
      "Dynamic programming (DP) is an algorithmic technique for solving problems with overlapping subproblems and optimal substructure by storing the results of subproblems to avoid redundant recomputation. Fibonacci numbers are the canonical DP teaching example: the naive recursive Fibonacci makes 2^n calls because fib(n) = fib(n-1) + fib(n-2) and both branches recompute fib(n-2), fib(n-3) etc. Top-down DP (memoisation) stores results in a cache on the first call and returns cached results on all subsequent calls, dropping the complexity to O(n). Bottom-up DP (tabulation) fills a table from smallest to largest subproblem, avoiding recursion entirely. Understanding Fibonacci DP builds the mental model for all DP problems: identify subproblems, define recurrence, choose memoisation or tabulation.",
    intuition:
      "Computing fib(5) naively computes fib(3) twice, fib(2) three times, fib(1) five times. The work explodes exponentially. Imagine you have a notepad: the first time you compute fib(k), write the answer down. Next time someone asks for fib(k), just read off your notepad — instant O(1). That's memoisation. Tabulation is even simpler: fill the notepad from bottom to top in one pass, never looking things up.",
    how_it_works: [
      "1. Define the subproblem: fib(n) = number of ways to tile n steps using 1 or 2 steps (classic interpretation).",
      "2. Write the recurrence: fib(n) = fib(n-1) + fib(n-2), base cases fib(0)=0, fib(1)=1.",
      "3. Memoisation (top-down): add a cache dict; before computing, check if fib(n) is cached. If yes, return it. If no, compute and store.",
      "4. Tabulation (bottom-up): create array dp of size n+1; set dp[0]=0, dp[1]=1.",
      "5. Fill dp[i] = dp[i-1] + dp[i-2] for i from 2 to n.",
      "6. Return dp[n].",
      "7. Space optimisation: since fib(n) only depends on the last two values, use two variables instead of a full array.",
      "8. The space-optimised version uses O(1) space and O(n) time — optimal for this problem.",
    ],
    worked_example: {
      label: "Compute fib(7) using tabulation",
      steps: [
        "Init:  dp=[0,1,_,_,_,_,_,_]",
        "i=2:   dp[2] = dp[1]+dp[0] = 1+0 = 1  →  dp=[0,1,1,_,_,_,_,_]",
        "i=3:   dp[3] = dp[2]+dp[1] = 1+1 = 2  →  dp=[0,1,1,2,_,_,_,_]",
        "i=4:   dp[4] = dp[3]+dp[2] = 2+1 = 3  →  dp=[0,1,1,2,3,_,_,_]",
        "i=5:   dp[5] = dp[4]+dp[3] = 3+2 = 5  →  dp=[0,1,1,2,3,5,_,_]",
        "i=6:   dp[6] = dp[5]+dp[4] = 5+3 = 8  →  dp=[0,1,1,2,3,5,8,_]",
        "i=7:   dp[7] = dp[6]+dp[5] = 8+5 = 13 →  dp=[0,1,1,2,3,5,8,13]",
      ],
      result: "fib(7) = 13. Compare: naive recursion makes 41 calls for fib(7); tabulation makes 7.",
    },
    code: `import functools

# 1. Naive recursion — O(2^n) time
def fib_naive(n):
    if n <= 1: return n
    return fib_naive(n-1) + fib_naive(n-2)

# 2. Memoisation (top-down DP) — O(n) time, O(n) space
@functools.lru_cache(maxsize=None)
def fib_memo(n):
    if n <= 1: return n
    return fib_memo(n-1) + fib_memo(n-2)

# 3. Tabulation (bottom-up DP) — O(n) time, O(n) space
def fib_tab(n):
    if n <= 1: return n
    dp = [0] * (n + 1)
    dp[1] = 1
    for i in range(2, n + 1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]

# 4. Space-optimised — O(n) time, O(1) space
def fib_opt(n):
    a, b = 0, 1
    for _ in range(n): a, b = b, a + b
    return a

print(fib_opt(10))  # → 55`,
    time_complexity: {
      best: "O(n)",
      average: "O(n)",
      worst: "O(2^n)",
      note: "O(n) with memoisation/tabulation. O(2^n) for naive recursion without caching.",
    },
    space_complexity: {
      value: "O(1) to O(n)",
      note: "O(1) for space-optimised two-variable approach. O(n) for full tabulation array or memo cache.",
    },
    advantages: [
      "Converts exponential recursion to linear time by caching subproblem results.",
      "Bottom-up tabulation eliminates recursion overhead entirely.",
      "Space can be optimised to O(1) when only the last k states are needed.",
      "The DP template (define subproblem, recurrence, base cases) applies universally.",
    ],
    disadvantages: [
      "Identifying the right subproblem definition is non-obvious for harder problems.",
      "Memoisation has function-call overhead; tabulation is faster in practice.",
      "Not applicable when subproblems are not overlapping or do not have optimal substructure.",
    ],
    applications: [
      "Climbing stairs / coin change (1D DP)",
      "0/1 knapsack, subset sum (2D DP)",
      "Longest common subsequence / edit distance",
      "Fibonacci-based counting problems (decode ways, tiling)",
      "Matrix chain multiplication",
      "Shortest path in DAG (Bellman-Ford)",
    ],
    common_mistakes: [
      {
        title: "Forgetting base cases in the DP table",
        description:
          "dp[0] and dp[1] must be explicitly set before filling the table. Without correct base cases, the recurrence propagates wrong values through the entire table.",
      },
      {
        title: "Memoising globally instead of per-call",
        description:
          "Using a global mutable default argument (def fib(n, memo={})) as the cache leaks state between test calls. Use @functools.lru_cache or pass the dict explicitly.",
      },
    ],
    tips: [
      "Always draw the recursion tree first — it reveals the overlapping subproblems that DP will eliminate.",
      "Space optimisation: if dp[i] depends only on dp[i-1] and dp[i-2], replace the array with two variables.",
      "The 'think iteratively, code recursively with memo' approach works for most 1D DP: write the recursive solution, add lru_cache, then convert to tabulation if needed.",
      "Matrix exponentiation can compute fib(n) in O(log n) time — useful for extremely large n.",
    ],
    fun_fact:
      "The Fibonacci sequence appears in the arrangement of sunflower seeds, pinecone spirals, nautilus shells, and petal counts in flowers — a phenomenon studied by botanists and mathematicians for centuries. The number of ancestor rabbits in Fibonacci's original 1202 problem grows as fib(n), making Fibonacci numbers the world's oldest known O(n) DP problem.",
  },

  knapsack: {
    concept: "0/1 Knapsack Problem",
    tagline: "Maximize value under a weight constraint — the quintessential 2D dynamic programming problem.",
    introduction:
      "The 0/1 Knapsack problem asks: given a set of items each with a weight and a value, and a knapsack with a maximum weight capacity W, which items should you include to maximize the total value without exceeding W? Each item can either be included (1) or excluded (0) — hence '0/1'. The naive brute force considers all 2^n subsets, which is exponential. Dynamic programming solves it in O(n·W) time and O(n·W) space by building a 2D table dp[i][w] = maximum value achievable using items 1..i with weight capacity w. The recurrence is dp[i][w] = max(dp[i-1][w], value[i] + dp[i-1][w-weight[i]]) — either skip item i or take it if it fits. This forms the blueprint for many DP problems.",
    intuition:
      "You're packing a backpack for a hiking trip with limited weight capacity. For each item, you ask: 'If I include this item, I gain its value but lose weight capacity; if I exclude it, my capacity is unchanged.' The 2D DP table stores the best possible value for every combination of 'items considered so far' and 'remaining capacity.' The table fills from small problems (one item, small capacity) to the full problem, building on previously computed answers.",
    how_it_works: [
      "1. Define dp[i][w] = max total value using first i items and capacity w.",
      "2. Base cases: dp[0][w] = 0 for all w (no items = 0 value); dp[i][0] = 0 for all i (no capacity = 0 value).",
      "3. For each item i from 1 to n and each capacity w from 0 to W:",
      "4.   Option A (skip item i): dp[i][w] = dp[i-1][w].",
      "5.   Option B (take item i, if weight[i] <= w): dp[i][w] = value[i] + dp[i-1][w - weight[i]].",
      "6.   Take the maximum of Option A and Option B.",
      "7. dp[n][W] is the answer — maximum value with all items and full capacity.",
      "8. To reconstruct which items were taken, trace back from dp[n][W] comparing to dp[n-1][W].",
    ],
    worked_example: {
      label: "Items: [(w=2,v=6),(w=2,v=10),(w=3,v=12)], W=5",
      steps: [
        "       w=0  w=1  w=2  w=3  w=4  w=5",
        "i=0:    0    0    0    0    0    0   (no items)",
        "i=1(2,6): 0   0    6    6    6    6   (item1 fits at w>=2)",
        "i=2(2,10): 0  0   10   10   16   16   (item2 alone=10; both=16 at w=4,5)",
        "i=3(3,12): 0  0   10   12   16   22   (item2+item3=22 at w=5) ← answer",
      ],
      result: "Maximum value = 22 (take items 2 and 3: weights 2+3=5, values 10+12=22)",
    },
    code: `def knapsack(weights, values, W):
    n = len(weights)
    # dp[i][w] = max value using first i items, capacity w
    dp = [[0] * (W + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        wi, vi = weights[i-1], values[i-1]
        for w in range(W + 1):
            dp[i][w] = dp[i-1][w]          # skip item i
            if wi <= w:                    # take item i if it fits
                dp[i][w] = max(dp[i][w], vi + dp[i-1][w - wi])
    return dp[n][W]

weights = [2, 2, 3]
values  = [6, 10, 12]
W = 5
print(knapsack(weights, values, W))  # → 22`,
    time_complexity: {
      best: "O(n·W)",
      average: "O(n·W)",
      worst: "O(n·W)",
      note: "The DP table has n·W cells, each computed in O(1). Note: this is pseudo-polynomial — W is an input value, not log W.",
    },
    space_complexity: {
      value: "O(n·W) or O(W)",
      note: "Full 2D table is O(n·W). Space-optimised 1D rolling array reduces to O(W) by iterating w in reverse.",
    },
    advantages: [
      "Transforms exponential brute force to polynomial O(n·W).",
      "The 2D DP template extends to unbounded knapsack, subset sum, and partition problems.",
      "Straightforward recurrence relation that is easy to verify.",
      "Can be space-optimised to O(W) with a rolling 1D array.",
    ],
    disadvantages: [
      "Pseudo-polynomial: O(n·W) can be large if W is very large (e.g., W = 10^9).",
      "Not a polynomial algorithm in the strict sense — knapsack is NP-hard in the input bit size.",
      "2D table reconstruction requires O(n·W) space even when only the max value is needed.",
    ],
    applications: [
      "Resource allocation (CPU, memory, budget)",
      "Portfolio optimisation (maximize return under risk budget)",
      "Cargo loading for ships and aircraft",
      "Subset sum and partition equal subset sum problems",
      "Feature selection in machine learning under memory constraints",
      "Cryptographic algorithms (subset-sum knapsack ciphers)",
    ],
    common_mistakes: [
      {
        title: "Iterating w forwards in the 1D space-optimised version",
        description:
          "In the space-optimised O(W) version, you MUST iterate w from W down to weight[i]. If you iterate forwards, dp[w-wi] has already been updated for item i, allowing item i to be counted multiple times (turning it into unbounded knapsack).",
      },
      {
        title: "0-indexing vs 1-indexing confusion in the DP table",
        description:
          "dp[i][w] typically uses 1-indexed items (item i corresponds to weights[i-1]). Mixing 0- and 1-indexing causes off-by-one errors that silently produce wrong answers.",
      },
      {
        title: "Forgetting to initialise dp to zeros",
        description:
          "The base cases dp[0][*] = 0 and dp[*][0] = 0 must be initialised before filling. In Python, [[0]*(W+1) for _ in range(n+1)] handles this, but forgetting gives garbage results.",
      },
    ],
    tips: [
      "Space optimisation: replace 2D array with 1D dp[w], iterate i outer, w from W to weight[i] inner.",
      "Unbounded knapsack (unlimited copies of each item): iterate w from weight[i] to W (forwards) in the 1D version.",
      "Subset sum is a special case: values = weights, find if dp[n][target] is achievable.",
      "For very large W, consider meet-in-the-middle: split items into two halves, enumerate all 2^(n/2) subsets of each, then binary search — O(2^(n/2) · n) time.",
    ],
    fun_fact:
      "The 0/1 Knapsack problem was one of the first problems proved to be NP-hard in Karp's landmark 1972 paper that established 21 NP-complete problems. Yet its DP solution runs in O(n·W) — this apparent contradiction (NP-hard but fast?) is explained by the distinction between polynomial (input size in bits) and pseudo-polynomial (input value). If W is encoded in binary, W can be exponentially large relative to the number of bits used to represent it.",
  },
};

export const RELATED_QUESTIONS = {
  binary_search: [
    { title: "Binary Search", difficulty: "Easy", description: "Classic implementation on a sorted array." },
    { title: "Search in Rotated Sorted Array", difficulty: "Medium", description: "Apply binary search on a rotated array." },
    { title: "Find Minimum in Rotated Sorted Array", difficulty: "Medium", description: "Locate the pivot using binary search." },
    { title: "Search a 2D Matrix", difficulty: "Medium", description: "Treat the matrix as a flattened sorted array." },
    { title: "Find Peak Element", difficulty: "Medium", description: "Binary search on unsorted with local property." },
    { title: "Median of Two Sorted Arrays", difficulty: "Hard", description: "Binary search on partition positions." },
  ],
  two_pointers: [
    { title: "Two Sum II – Input Array Is Sorted", difficulty: "Medium", description: "Classic two-pointer on a sorted array." },
    { title: "3Sum", difficulty: "Medium", description: "Fix one element, two-pointer for the rest." },
    { title: "Container With Most Water", difficulty: "Medium", description: "Maximize area by moving the shorter pointer." },
    { title: "Trapping Rain Water", difficulty: "Hard", description: "Two pointers track left/right max heights." },
    { title: "Valid Palindrome", difficulty: "Easy", description: "Compare characters from both ends." },
    { title: "Remove Duplicates from Sorted Array", difficulty: "Easy", description: "Slow/fast pointer to overwrite duplicates in-place." },
  ],
  sliding_window: [
    { title: "Longest Substring Without Repeating Characters", difficulty: "Medium", description: "Expand window; shrink on duplicate." },
    { title: "Minimum Window Substring", difficulty: "Hard", description: "Find smallest window containing all target chars." },
    { title: "Sliding Window Maximum", difficulty: "Hard", description: "Use a monotonic deque inside the window." },
    { title: "Permutation in String", difficulty: "Medium", description: "Fixed-size window with frequency count." },
    { title: "Fruit Into Baskets", difficulty: "Medium", description: "Longest subarray with at most 2 distinct values." },
    { title: "Maximum Average Subarray I", difficulty: "Easy", description: "Fixed window, track running sum." },
  ],
  linked_list: [
    { title: "Reverse Linked List", difficulty: "Easy", description: "Iterative or recursive reversal." },
    { title: "Linked List Cycle", difficulty: "Easy", description: "Floyd's slow/fast pointer detection." },
    { title: "Merge Two Sorted Lists", difficulty: "Easy", description: "Merge by comparing heads repeatedly." },
    { title: "Remove Nth Node From End of List", difficulty: "Medium", description: "Two pointers with N-step gap." },
    { title: "Reorder List", difficulty: "Medium", description: "Find middle, reverse second half, merge." },
    { title: "LRU Cache", difficulty: "Medium", description: "Doubly linked list + hash map for O(1) ops." },
  ],
  hash_map: [
    { title: "Two Sum", difficulty: "Easy", description: "Store complement in map; single pass." },
    { title: "Group Anagrams", difficulty: "Medium", description: "Sorted string as key to group anagrams." },
    { title: "Top K Frequent Elements", difficulty: "Medium", description: "Frequency map + bucket sort or heap." },
    { title: "Longest Consecutive Sequence", difficulty: "Medium", description: "Set lookup for O(n) chain detection." },
    { title: "Subarray Sum Equals K", difficulty: "Medium", description: "Prefix sum map to count target subarrays." },
    { title: "First Missing Positive", difficulty: "Hard", description: "Use the array itself as a hash map." },
  ],
  stack_queue: [
    { title: "Valid Parentheses", difficulty: "Easy", description: "Push open brackets, match on close." },
    { title: "Min Stack", difficulty: "Medium", description: "Auxiliary stack tracks running minimum." },
    { title: "Evaluate Reverse Polish Notation", difficulty: "Medium", description: "Stack-based expression evaluator." },
    { title: "Daily Temperatures", difficulty: "Medium", description: "Monotonic stack to find next warmer day." },
    { title: "Largest Rectangle in Histogram", difficulty: "Hard", description: "Monotonic stack tracks bar boundaries." },
    { title: "Implement Queue using Stacks", difficulty: "Easy", description: "Two stacks simulate FIFO order." },
  ],
  binary_tree: [
    { title: "Maximum Depth of Binary Tree", difficulty: "Easy", description: "Recursive DFS height calculation." },
    { title: "Invert Binary Tree", difficulty: "Easy", description: "Swap left and right children recursively." },
    { title: "Diameter of Binary Tree", difficulty: "Easy", description: "Track max left+right depth at each node." },
    { title: "Lowest Common Ancestor", difficulty: "Medium", description: "Recurse; node is LCA when both sides found." },
    { title: "Binary Tree Level Order Traversal", difficulty: "Medium", description: "BFS with queue, process level by level." },
    { title: "Serialize and Deserialize Binary Tree", difficulty: "Hard", description: "Encode tree to string; rebuild from preorder." },
  ],
  bfs: [
    { title: "Number of Islands", difficulty: "Medium", description: "BFS/DFS flood-fill to count components." },
    { title: "Rotting Oranges", difficulty: "Medium", description: "Multi-source BFS from all rotten cells." },
    { title: "Word Ladder", difficulty: "Hard", description: "BFS on word graph with single-char transforms." },
    { title: "Shortest Path in Binary Matrix", difficulty: "Medium", description: "8-directional BFS for minimum path." },
    { title: "Clone Graph", difficulty: "Medium", description: "BFS with visited map to clone each node." },
    { title: "Pacific Atlantic Water Flow", difficulty: "Medium", description: "Reverse BFS from both ocean borders." },
  ],
  dfs: [
    { title: "Path Sum", difficulty: "Easy", description: "DFS tracking remaining target down each path." },
    { title: "All Paths From Source to Target", difficulty: "Medium", description: "DFS backtracking on a DAG." },
    { title: "Course Schedule", difficulty: "Medium", description: "DFS cycle detection in a directed graph." },
    { title: "Word Search", difficulty: "Medium", description: "DFS backtracking on a 2-D grid." },
    { title: "Number of Connected Components", difficulty: "Medium", description: "DFS/union-find to count graph components." },
    { title: "Sudoku Solver", difficulty: "Hard", description: "Constraint-based DFS with backtracking." },
  ],
  bubble_sort: [
    { title: "Sort Colors", difficulty: "Medium", description: "Dutch National Flag — 3-way partition sort." },
    { title: "Sort an Array", difficulty: "Medium", description: "Implement any comparison-based sort." },
    { title: "Kth Largest Element in an Array", difficulty: "Medium", description: "Quickselect or heap for O(n) average." },
    { title: "Merge Intervals", difficulty: "Medium", description: "Sort then scan to merge overlapping ranges." },
  ],
  merge_sort: [
    { title: "Sort List", difficulty: "Medium", description: "Merge sort adapted for linked lists." },
    { title: "Count of Smaller Numbers After Self", difficulty: "Hard", description: "Merge sort tracks inversions during merge." },
    { title: "Reverse Pairs", difficulty: "Hard", description: "Count pairs (i,j) where nums[i] > 2·nums[j]." },
    { title: "Merge k Sorted Lists", difficulty: "Hard", description: "Divide-and-conquer or min-heap merge." },
    { title: "Merge Intervals", difficulty: "Medium", description: "Sort by start, then merge overlapping." },
  ],
  quick_sort: [
    { title: "Kth Largest Element in an Array", difficulty: "Medium", description: "Quickselect — partial pivot without full sort." },
    { title: "Sort Colors", difficulty: "Medium", description: "Single-pass 3-way partition (Dutch flag)." },
    { title: "Wiggle Sort II", difficulty: "Medium", description: "Partition-based rearrangement." },
    { title: "Top K Frequent Elements", difficulty: "Medium", description: "Quickselect on frequency array." },
    { title: "Find K Closest Elements", difficulty: "Medium", description: "Binary search + sliding window or partition." },
  ],
  fibonacci_dp: [
    { title: "Climbing Stairs", difficulty: "Easy", description: "Classic Fibonacci recurrence in disguise." },
    { title: "House Robber", difficulty: "Medium", description: "DP with skip-one recurrence." },
    { title: "House Robber II", difficulty: "Medium", description: "Circular array — run DP twice." },
    { title: "Decode Ways", difficulty: "Medium", description: "Count decodings using Fibonacci-style DP." },
    { title: "Minimum Cost Climbing Stairs", difficulty: "Easy", description: "Pay cost at each stair, minimize total." },
    { title: "Longest Increasing Subsequence", difficulty: "Medium", description: "DP with O(n²) or patience sort O(n log n)." },
  ],
  knapsack: [
    { title: "Partition Equal Subset Sum", difficulty: "Medium", description: "0/1 knapsack: can we hit exactly sum/2?" },
    { title: "Target Sum", difficulty: "Medium", description: "Assign +/− to reach target — DP or DFS." },
    { title: "Coin Change", difficulty: "Medium", description: "Unbounded knapsack for minimum coins." },
    { title: "Coin Change II", difficulty: "Medium", description: "Count ways to make amount — unbounded DP." },
    { title: "Last Stone Weight II", difficulty: "Medium", description: "Minimize difference via subset-sum DP." },
    { title: "Ones and Zeroes", difficulty: "Medium", description: "2-D knapsack with two capacity constraints." },
  ],
};
