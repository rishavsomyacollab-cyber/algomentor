import { useState } from "react";

const str = (v) => (typeof v === "string" ? v : v ? String(v) : "");

// ── Hardcoded mathematical derivations for all 14 topics ────────────────────

const MATH = {
  binary_search: {
    recurrence: "T(n) = T(n/2) + O(1)",
    time: {
      best:    { value: "O(1)",     steps: ["Target is at the first mid index checked", "1 comparison → done", "∴ O(1)"] },
      average: { value: "O(log n)", steps: ["Expected comparisons ≈ log₂n − 1", "Each check halves remaining range", "∴ O(log n)"] },
      worst:   { value: "O(log n)", steps: [
        "n  →  n/2  →  n/4  →  …  →  1",
        "After k steps:  n / 2ᵏ = 1",
        "⟹  2ᵏ = n",
        "⟹  k = log₂n",
        "Each step: O(1) work",
        "Total: k × O(1) = O(log n)",
        "∴ T(n) = O(log n)",
      ]},
    },
    space: { value: "O(1)", steps: ["3 variables only: left, right, mid", "No memory grows with n", "∴ O(1)"] },
  },

  two_pointers: {
    time: {
      best:    { value: "O(n)", steps: ["Both pointers sweep array once", "Total moves ≤ 2n", "∴ O(n)"] },
      average: { value: "O(n)", steps: ["Each element visited ≤ 1 time by each pointer", "Total iterations ≤ 2n", "∴ O(n)"] },
      worst:   { value: "O(n)", steps: ["Left travels n steps, right travels n steps", "Total ≤ 2n = O(n)", "∴ O(n)"] },
    },
    space: { value: "O(1)", steps: ["Only left and right index variables", "∴ O(1)"] },
  },

  bubble_sort: {
    time: {
      best:    { value: "O(n)",  steps: ["Array already sorted + swap flag used", "Pass 1: n−1 comparisons, 0 swaps → exit early", "∴ O(n)"] },
      average: { value: "O(n²)", steps: [
        "Expected swaps per element ≈ n/4",
        "Total comparisons ≈ n(n−1)/4",
        "∴ O(n²)",
      ]},
      worst:   { value: "O(n²)", steps: [
        "Pass 0 :  n−1  comparisons",
        "Pass 1 :  n−2  comparisons",
        "Pass 2 :  n−3  comparisons",
        "  ⋮",
        "Pass n−2:   1  comparison",
        "",
        "Total  =  Σᵢ₌₀ⁿ⁻² (n−1−i)",
        "       =  (n−1) + (n−2) + … + 1",
        "       =  n(n−1) / 2",
        "       =  n²/2  −  n/2",
        "∴ T(n) = O(n²)",
      ]},
    },
    space: { value: "O(1)", steps: ["In-place swaps, only loop counters i and j", "∴ O(1)"] },
  },

  merge_sort: {
    recurrence: "T(n) = 2T(n/2) + O(n)",
    time: {
      best:    { value: "O(n log n)", steps: mergeSteps() },
      average: { value: "O(n log n)", steps: mergeSteps() },
      worst:   { value: "O(n log n)", steps: mergeSteps() },
    },
    space: { value: "O(n)", steps: [
      "Each merge needs a temp array of the subarray's size",
      "Max temp size at any moment = n  (top-level merge)",
      "log₂n levels, but only 1 level active at a time",
      "∴ O(n)",
    ]},
  },

  quick_sort: {
    time: {
      best:    { value: "O(n log n)", steps: [
        "Pivot splits array into two equal halves each time",
        "T(n) = 2T(n/2) + n",
        "  a=2, b=2, f(n)=n",
        "  log_b(a) = log₂2 = 1",
        "  f(n) = n¹ = Θ(n^(log_b a))  →  Case 2",
        "∴ T(n) = Θ(n log n)",
      ]},
      average: { value: "O(n log n)", steps: [
        "Random pivot → expected split ratio ≈ 1:1",
        "T(n) = T(n/2) + T(n/2) + n  (expected)",
        "Same recurrence as best case",
        "∴ T(n) = O(n log n) expected",
      ]},
      worst:   { value: "O(n²)", steps: [
        "Pivot always = min or max element (sorted input)",
        "T(n) = T(n−1) + T(0) + n",
        "     = T(n−1) + n",
        "",
        "Unrolling:",
        "  T(n) = n + (n−1) + (n−2) + … + 1",
        "       = Σₖ₌₁ⁿ k",
        "       = n(n+1) / 2",
        "∴ T(n) = O(n²)",
      ]},
    },
    space: { value: "O(log n)", steps: [
      "Recursion depth = partition tree height",
      "Average depth (balanced splits) = log₂n",
      "Worst depth (skewed splits) = n  → O(n) space",
      "∴ Average = O(log n),  Worst = O(n)",
    ]},
  },

  bfs: {
    time: {
      best:    { value: "O(V + E)", steps: bfsSteps() },
      average: { value: "O(V + E)", steps: bfsSteps() },
      worst:   { value: "O(V + E)", steps: bfsSteps() },
    },
    space: { value: "O(V)", steps: [
      "Queue holds at most one full level ≤ V vertices",
      "Visited set tracks all V vertices",
      "∴ O(V)",
    ]},
  },

  dfs: {
    time: {
      best:    { value: "O(V + E)", steps: dfsSteps() },
      average: { value: "O(V + E)", steps: dfsSteps() },
      worst:   { value: "O(V + E)", steps: dfsSteps() },
    },
    space: { value: "O(V)", steps: [
      "Call stack depth = longest path ≤ V",
      "Visited set stores all V vertices",
      "∴ O(V)",
    ]},
  },

  fibonacci_dp: {
    time: {
      best:    { value: "O(n)", steps: fibSteps() },
      average: { value: "O(n)", steps: fibSteps() },
      worst:   { value: "O(n)", steps: fibSteps() },
    },
    space: { value: "O(n)", steps: [
      "DP table stores fib(0)…fib(n)  →  n+1 entries",
      "Optimised version keeps only last 2 values",
      "∴ Table = O(n),  Optimised = O(1)",
    ]},
  },

  knapsack: {
    time: {
      best:    { value: "O(nW)", steps: knapsackSteps() },
      average: { value: "O(nW)", steps: knapsackSteps() },
      worst:   { value: "O(nW)", steps: knapsackSteps() },
    },
    space: { value: "O(nW)", steps: [
      "2D table: (n+1) rows × (W+1) columns = (n+1)(W+1) cells",
      "1D optimisation: process items in reverse over W",
      "∴ Standard = O(nW),  1D optimised = O(W)",
    ]},
  },

  linked_list: {
    time: {
      best:    { value: "O(1)", steps: ["Insert/delete at head: update 1 pointer", "∴ O(1)"] },
      average: { value: "O(n)", steps: [
        "Search: start at head, walk forward",
        "Expected position ≈ n/2 hops",
        "∴ O(n)",
      ]},
      worst:   { value: "O(n)", steps: [
        "Target at tail or not present",
        "Must traverse all n nodes",
        "∴ O(n)",
      ]},
    },
    space: { value: "O(n)", steps: ["n nodes × O(1) per node (value + next ptr)", "∴ O(n)"] },
  },

  binary_tree: {
    time: {
      best:    { value: "O(log n)", steps: [
        "Balanced BST:  height h = ⌊log₂n⌋",
        "Search follows one root-to-leaf path",
        "Path length = h = log₂n",
        "∴ O(log n)",
      ]},
      average: { value: "O(log n)", steps: [
        "Random BST average height ≈ 1.39 log₂n",
        "  (proved by Reed, 2003)",
        "∴ O(log n)",
      ]},
      worst:   { value: "O(n)", steps: [
        "Degenerate / skewed tree",
        "All n nodes in one chain: height = n−1",
        "∴ O(n)",
      ]},
    },
    space: { value: "O(n)", steps: [
      "n nodes stored = O(n)",
      "Traversal stack depth = height h",
      "  Balanced: O(log n)  |  Skewed: O(n)",
      "∴ Storage O(n),  stack O(h)",
    ]},
  },

  hash_map: {
    time: {
      best:    { value: "O(1)", steps: ["Key hashes to an empty bucket", "1 array access + 0 chain walk", "∴ O(1)"] },
      average: { value: "O(1)", steps: [
        "Load factor  α = n / m  (n keys, m buckets)",
        "Uniform hashing → expected chain length = α",
        "Resize at α ≈ 0.75 keeps chain length → O(1)",
        "∴ O(1) amortized",
      ]},
      worst:   { value: "O(n)", steps: [
        "All n keys collide into the same bucket",
        "Lookup walks chain of length n",
        "∴ O(n)",
      ]},
    },
    space: { value: "O(n)", steps: [
      "m buckets array  +  n key-value pairs",
      "m = n/α = O(n)  (constant load factor)",
      "∴ O(n)",
    ]},
  },

  sliding_window: {
    time: {
      best:    { value: "O(n)", steps: [
        "Right pointer: n advances",
        "Left pointer: ≤ n advances total",
        "Total moves ≤ 2n",
        "∴ O(n)",
      ]},
      average: { value: "O(n)", steps: [
        "Each element enters window once (right++)",
        "Each element leaves window once (left++)",
        "Total operations = 2n",
        "∴ O(n)",
      ]},
      worst:   { value: "O(n)", steps: [
        "Right sweeps n steps, left sweeps ≤ n steps",
        "2n total pointer moves = O(n)",
        "∴ O(n)",
      ]},
    },
    space: { value: "O(k)", steps: [
      "Fixed window: just two indices  →  O(1)",
      "Frequency map: ≤ k distinct chars in window",
      "∴ O(k)  where k = window size or alphabet size",
    ]},
  },

  stack_queue: {
    time: {
      best:    { value: "O(1)", steps: ["Push/pop/enqueue/dequeue: touch exactly 1 element", "∴ O(1)"] },
      average: { value: "O(1)", steps: ["All core ops are O(1) regardless of size", "∴ O(1)"] },
      worst:   { value: "O(1) amortized", steps: [
        "Occasional resize copies n elements  →  O(n) once",
        "But n pushes trigger ≤ log n resizes",
        "Total copies over n ops:",
        "  n/2 + n/4 + … ≤ n  (geometric series)",
        "Amortized cost = n / n = O(1) per op",
        "∴ O(1) amortized",
      ]},
    },
    space: { value: "O(n)", steps: ["n elements stored in array or linked list", "∴ O(n)"] },
  },
};

function mergeSteps() {
  return [
    "Recurrence:  T(n) = 2T(n/2) + n",
    "",
    "Apply Master Theorem  aT(n/b) + f(n):",
    "  a = 2,  b = 2,  f(n) = n",
    "  log_b(a) = log₂2 = 1",
    "  f(n) = n¹ = Θ(n^(log_b a))  →  Case 2",
    "",
    "Case 2:  T(n) = Θ(n · log n)",
    "∴ T(n) = O(n log n)",
  ];
}

function bfsSteps() {
  return [
    "Each vertex:  enqueued once  +  dequeued once  →  O(V)",
    "Each edge:    examined once per endpoint       →  O(E)",
    "Total work = O(V) + O(E)",
    "∴ O(V + E)",
  ];
}

function dfsSteps() {
  return [
    "Each vertex: visited exactly once  →  O(V)",
    "Each edge:   traversed ≤ 2 times   →  O(E)",
    "Total = O(V) + O(E)",
    "∴ O(V + E)",
  ];
}

function fibSteps() {
  return [
    "Naïve recursion (no DP):",
    "  T(n) = T(n−1) + T(n−2)  ⟹  O(2ⁿ)",
    "",
    "With DP tabulation:",
    "  Fill table: fib[0], fib[1], …, fib[n]",
    "  Each cell = O(1)  (uses previous two)",
    "  Total = n cells × O(1)",
    "∴ O(n)",
  ];
}

function knapsackSteps() {
  return [
    "Build DP table  dp[i][w]:",
    "  i ∈ [0, n]  (items)",
    "  w ∈ [0, W]  (capacity)",
    "  dp[i][w] = max(dp[i−1][w], val[i] + dp[i−1][w−wt[i]])",
    "  Each cell: O(1)",
    "",
    "Total cells = (n+1)(W+1) ≈ nW",
    "∴ O(nW)",
  ];
}

// ── Colors ───────────────────────────────────────────────────────────────────

const CASE_COLORS = {
  best:    { label: "Best Case",    accent: "#4ade80", bg: "rgba(74,222,128,.07)",  border: "rgba(74,222,128,.3)"  },
  average: { label: "Average Case", accent: "#fbbf24", bg: "rgba(251,191,36,.07)",  border: "rgba(251,191,36,.3)"  },
  worst:   { label: "Worst Case",   accent: "#f87171", bg: "rgba(248,113,113,.07)", border: "rgba(248,113,113,.3)" },
};

// ── MathBlock: renders derivation steps ─────────────────────────────────────

function MathBlock({ steps, accent }) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  return (
    <div style={{
      marginTop: 12,
      background: "var(--bg)",
      border: `1px solid ${accent}30`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      padding: "12px 14px",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: ".1em",
        textTransform: "uppercase", color: accent, marginBottom: 10,
      }}>
        Derivation
      </div>
      {steps.map((line, i) => {
        if (line === "") return <div key={i} style={{ height: 7 }} />;
        const isConclusion = line.trimStart().startsWith("∴");
        const isIndented   = line.startsWith("  ") || line.startsWith("\t");
        return (
          <div key={i} style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 13,
            lineHeight: 1.75,
            paddingLeft: isIndented ? 18 : 0,
            color: isConclusion ? accent : "var(--text)",
            fontWeight: isConclusion ? 700 : 400,
            background: isConclusion ? `${accent}18` : "transparent",
            borderRadius: isConclusion ? 4 : 0,
            padding: isConclusion ? "2px 8px" : `0 0 0 ${isIndented ? 18 : 0}px`,
            marginBottom: isConclusion ? 2 : 0,
            display: "block",
          }}>
            {line.trim()}
          </div>
        );
      })}
    </div>
  );
}

// ── CaseCard ─────────────────────────────────────────────────────────────────

function CaseCard({ caseKey, value, reasoning, steps }) {
  const c = CASE_COLORS[caseKey];
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 10, overflow: "hidden", borderTop: `3px solid ${c.accent}` }}>
      <div style={{ background: c.bg, padding: "16px 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: c.accent, marginBottom: 6 }}>
          {c.label}
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 30, fontWeight: 800, color: c.accent, lineHeight: 1, marginBottom: reasoning ? 8 : 0 }}>
          {value || "—"}
        </div>
        {reasoning && (
          <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.6 }}>{reasoning}</p>
        )}
        <MathBlock steps={steps} accent={c.accent} />
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function ComplexityPanel({ data, topicId }) {
  const [spaceOpen, setSpaceOpen] = useState(true);
  if (!data) return null;

  const math = MATH[topicId] || {};
  const tc   = data.time_complexity  || {};
  const sc   = data.space_complexity || {};

  const getVal    = (c) => str(math.time?.[c]?.value  || tc[c]);
  const getReason = (c) => str(tc[`${c}_reasoning`]);
  const getSteps  = (c) => math.time?.[c]?.steps  || [];

  const spaceVal    = str(math.space?.value   || sc.value);
  const spaceReason = str(sc.reasoning);
  const spaceSteps  = math.space?.steps || [];
  const recurrence  = math.recurrence   || data.recurrence_relation;

  return (
    <div className="complexity-panel">

      {/* Recurrence relation */}
      {recurrence && (
        <div style={{
          padding: "12px 18px", marginBottom: 16, borderRadius: 10,
          background: "rgba(129,140,248,.08)", border: "1px solid rgba(129,140,248,.3)",
          borderLeft: "3px solid #818cf8", display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: 20, color: "#a5b4fc", fontFamily: "JetBrains Mono, monospace" }}>ƒ</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#a5b4fc", marginBottom: 4 }}>
              Recurrence Relation
            </div>
            <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 16, fontWeight: 700, color: "#c4b5fd" }}>
              {recurrence}
            </code>
          </div>
        </div>
      )}

      {/* Best / Average / Worst */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
        {["best", "average", "worst"].map(c => (
          <CaseCard key={c} caseKey={c} value={getVal(c)} reasoning={getReason(c)} steps={getSteps(c)} />
        ))}
      </div>

      {/* Space complexity */}
      <div style={{
        border: "1px solid rgba(96,165,250,.3)", borderRadius: 10,
        overflow: "hidden", borderTop: "3px solid #60a5fa", marginBottom: 16,
      }}>
        <div style={{ background: "rgba(96,165,250,.07)", padding: "16px 18px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#60a5fa", marginBottom: 6 }}>
            Space Complexity
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 30, fontWeight: 800, color: "#60a5fa", lineHeight: 1, marginBottom: spaceReason ? 8 : 0 }}>
            {spaceVal || "—"}
          </div>
          {spaceReason && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "8px 0 0", lineHeight: 1.6 }}>{spaceReason}</p>
          )}
          <MathBlock steps={spaceSteps} accent="#60a5fa" />
        </div>
      </div>

      {/* Comparison table */}
      {Array.isArray(data.comparison_to_alternatives) && data.comparison_to_alternatives.length > 0 && (
        <div className="card section-card">
          <h3>Comparison to Alternatives</h3>
          <table className="comparison-table">
            <thead><tr><th>Algorithm</th><th>Time</th><th>Notes</th></tr></thead>
            <tbody>
              {data.comparison_to_alternatives.map((item, i) => (
                <tr key={i}>
                  <td>{str(item.algorithm)}</td>
                  <td style={{ fontFamily: "JetBrains Mono, monospace", color: "#fbbf24" }}>{str(item.time)}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{str(item.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.practical_notes && (
        <div className="card">
          <h3>Practical Notes</h3>
          <p style={{ lineHeight: 1.7 }}>{str(data.practical_notes)}</p>
        </div>
      )}
    </div>
  );
}
