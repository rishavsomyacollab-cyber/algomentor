"use client";

import { useState } from "react";
import type { ComplexityData } from "@/lib/types";

const str = (v: unknown): string =>
  typeof v === "string" ? v : v ? String(v) : "";

/* ── Per-topic math derivations ─────────────────────────────────────────── */
const MATH: Record<string, {
  recurrence?: string;
  time?: Record<string, { value: string; steps: string[] }>;
  space?: { value: string; steps: string[] };
}> = {
  binary_search: {
    recurrence: "T(n) = T(n/2) + O(1)",
    time: {
      best:    { value: "O(1)",     steps: ["Target is at the first mid index checked", "1 comparison → done", "∴ O(1)"] },
      average: { value: "O(log n)", steps: ["Expected comparisons ≈ log₂n − 1", "Each check halves remaining range", "∴ O(log n)"] },
      worst:   { value: "O(log n)", steps: ["n  →  n/2  →  n/4  →  …  →  1", "After k steps:  n / 2ᵏ = 1", "⟹  2ᵏ = n", "⟹  k = log₂n", "Each step: O(1) work", "Total: k × O(1) = O(log n)", "∴ T(n) = O(log n)"] },
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
      average: { value: "O(n²)", steps: ["Expected swaps per element ≈ n/4", "Total comparisons ≈ n(n−1)/4", "∴ O(n²)"] },
      worst:   { value: "O(n²)", steps: ["Pass 0 :  n−1  comparisons", "Pass 1 :  n−2  comparisons", "  ⋮", "Pass n−2:   1  comparison", "", "Total  =  Σᵢ₌₀ⁿ⁻² (n−1−i)", "       =  n(n−1) / 2", "∴ T(n) = O(n²)"] },
    },
    space: { value: "O(1)", steps: ["In-place swaps, only loop counters i and j", "∴ O(1)"] },
  },
  merge_sort: {
    recurrence: "T(n) = 2T(n/2) + O(n)",
    time: {
      best:    { value: "O(n log n)", steps: ["Recurrence:  T(n) = 2T(n/2) + n", "", "Apply Master Theorem:", "  a=2, b=2, f(n)=n, log_b(a)=1", "  f(n)=Θ(n^(log_b a))  →  Case 2", "∴ T(n) = O(n log n)"] },
      average: { value: "O(n log n)", steps: ["Same recurrence as best case", "∴ T(n) = O(n log n)"] },
      worst:   { value: "O(n log n)", steps: ["Same recurrence regardless of input order", "∴ T(n) = O(n log n)"] },
    },
    space: { value: "O(n)", steps: ["Each merge needs temp array", "Max size at any moment = n", "∴ O(n)"] },
  },
  quick_sort: {
    time: {
      best:    { value: "O(n log n)", steps: ["Pivot splits array into equal halves", "T(n) = 2T(n/2) + n  →  Case 2 Master Theorem", "∴ T(n) = O(n log n)"] },
      average: { value: "O(n log n)", steps: ["Random pivot → expected split ≈ 1:1", "∴ O(n log n) expected"] },
      worst:   { value: "O(n²)",      steps: ["Pivot = min or max (sorted input)", "T(n) = T(n−1) + n  →  Σk = n(n+1)/2", "∴ T(n) = O(n²)"] },
    },
    space: { value: "O(log n)", steps: ["Recursion depth = partition tree height", "Average depth = log₂n", "∴ O(log n) average,  O(n) worst"] },
  },
  bfs: {
    time: {
      best:    { value: "O(V + E)", steps: ["Each vertex: enqueued+dequeued once → O(V)", "Each edge: examined once → O(E)", "∴ O(V + E)"] },
      average: { value: "O(V + E)", steps: ["∴ O(V + E)"] },
      worst:   { value: "O(V + E)", steps: ["∴ O(V + E)"] },
    },
    space: { value: "O(V)", steps: ["Queue holds at most one full level ≤ V", "Visited set tracks all V vertices", "∴ O(V)"] },
  },
  dfs: {
    time: {
      best:    { value: "O(V + E)", steps: ["Each vertex: visited once → O(V)", "Each edge: traversed ≤ 2 times → O(E)", "∴ O(V + E)"] },
      average: { value: "O(V + E)", steps: ["∴ O(V + E)"] },
      worst:   { value: "O(V + E)", steps: ["∴ O(V + E)"] },
    },
    space: { value: "O(V)", steps: ["Call stack depth = longest path ≤ V", "∴ O(V)"] },
  },
  fibonacci_dp: {
    time: {
      best:    { value: "O(n)", steps: ["Naïve recursion: O(2ⁿ)", "", "With DP tabulation:", "  Fill fib[0]…fib[n], each O(1)", "∴ O(n)"] },
      average: { value: "O(n)", steps: ["∴ O(n)"] },
      worst:   { value: "O(n)", steps: ["∴ O(n)"] },
    },
    space: { value: "O(n)", steps: ["DP table: n+1 entries", "Optimised: keep last 2 values → O(1)", "∴ Table = O(n),  Optimised = O(1)"] },
  },
  knapsack: {
    time: {
      best:    { value: "O(nW)", steps: ["Build dp[i][w] for i∈[0,n], w∈[0,W]", "Each cell: O(1)", "Total = (n+1)(W+1) ≈ nW", "∴ O(nW)"] },
      average: { value: "O(nW)", steps: ["∴ O(nW)"] },
      worst:   { value: "O(nW)", steps: ["∴ O(nW)"] },
    },
    space: { value: "O(nW)", steps: ["2D table: (n+1)×(W+1)", "1D optimisation: O(W)", "∴ Standard=O(nW),  Optimised=O(W)"] },
  },
  linked_list: {
    time: {
      best:    { value: "O(1)", steps: ["Insert/delete at head: update 1 pointer", "∴ O(1)"] },
      average: { value: "O(n)", steps: ["Search: walk from head", "Expected position ≈ n/2 hops", "∴ O(n)"] },
      worst:   { value: "O(n)", steps: ["Target at tail or not present", "Must traverse all n nodes", "∴ O(n)"] },
    },
    space: { value: "O(n)", steps: ["n nodes × O(1) per node", "∴ O(n)"] },
  },
  binary_tree: {
    time: {
      best:    { value: "O(log n)", steps: ["Balanced BST: height = ⌊log₂n⌋", "Search follows root-to-leaf path", "∴ O(log n)"] },
      average: { value: "O(log n)", steps: ["Random BST avg height ≈ 1.39 log₂n", "∴ O(log n)"] },
      worst:   { value: "O(n)",     steps: ["Degenerate/skewed tree, height = n−1", "∴ O(n)"] },
    },
    space: { value: "O(n)", steps: ["n nodes stored = O(n)", "Stack depth: Balanced O(log n), Skewed O(n)", "∴ Storage O(n)"] },
  },
  hash_map: {
    time: {
      best:    { value: "O(1)", steps: ["Key hashes to empty bucket", "1 array access, 0 chain walk", "∴ O(1)"] },
      average: { value: "O(1)", steps: ["Load factor α = n/m, resize at α≈0.75", "∴ O(1) amortized"] },
      worst:   { value: "O(n)", steps: ["All n keys collide into same bucket", "Lookup walks chain of length n", "∴ O(n)"] },
    },
    space: { value: "O(n)", steps: ["m buckets + n key-value pairs", "m = n/α = O(n)", "∴ O(n)"] },
  },
  sliding_window: {
    time: {
      best:    { value: "O(n)", steps: ["Right: n advances, Left: ≤ n advances", "Total moves ≤ 2n", "∴ O(n)"] },
      average: { value: "O(n)", steps: ["Each element enters/leaves window once", "∴ O(n)"] },
      worst:   { value: "O(n)", steps: ["2n total pointer moves", "∴ O(n)"] },
    },
    space: { value: "O(k)", steps: ["Fixed window: two indices → O(1)", "Frequency map: ≤ k distinct chars", "∴ O(k)"] },
  },
  stack_queue: {
    time: {
      best:    { value: "O(1)", steps: ["Push/pop/enqueue/dequeue touch exactly 1 element", "∴ O(1)"] },
      average: { value: "O(1)", steps: ["All core ops are O(1) regardless of size", "∴ O(1)"] },
      worst:   { value: "O(1) amortized", steps: ["Resize copies n elements → O(n) once", "But n pushes trigger ≤ log n resizes", "Total copies ≤ n (geometric series)", "∴ O(1) amortized"] },
    },
    space: { value: "O(n)", steps: ["n elements stored", "∴ O(n)"] },
  },
};

/* ── Complexity scale (ordered slowest → fastest) ────────────────────────── */
const SCALE = ["O(1)","O(log n)","O(n)","O(n log n)","O(n²)","O(n³)","O(2ⁿ)"];
const SCALE_COLORS = ["#34d399","#4ade80","#fbbf24","#fb923c","#f87171","#ef4444","#dc2626"];

function scaleIndex(val: string): number {
  const clean = val.replace(/\s/g, "").toLowerCase();
  if (clean.includes("1)") && !clean.includes("log")) return 0;
  if (clean.includes("logn")) return 1;
  if (clean === "o(n)" || clean === "o(v)" || clean === "o(w)" || clean === "o(k)") return 2;
  if (clean.includes("nlogn") || clean.includes("v+e")) return 3;
  if (clean.includes("nw") || clean.includes("n²") || clean.includes("n^2")) return 4;
  if (clean.includes("n³") || clean.includes("n^3")) return 5;
  if (clean.includes("2ⁿ") || clean.includes("2^n")) return 6;
  return 2;
}

function ComplexityBadge({ value, size = "md" }: { value: string; size?: "sm"|"md"|"lg" }) {
  const idx   = scaleIndex(value);
  const color = SCALE_COLORS[Math.min(idx, SCALE_COLORS.length - 1)];
  const fs    = size === "lg" ? 28 : size === "md" ? 20 : 13;
  return (
    <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: fs, fontWeight: 800, color, lineHeight: 1 }}>
      {value || "—"}
    </span>
  );
}

function ComplexityBar({ value }: { value: string }) {
  const idx   = scaleIndex(value);
  const color = SCALE_COLORS[Math.min(idx, SCALE_COLORS.length - 1)];
  const pct   = ((idx + 1) / SCALE.length) * 100;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: "#34d399", fontFamily: "JetBrains Mono, monospace" }}>O(1)</span>
        <span style={{ fontSize: 10, color: "#dc2626", fontFamily: "JetBrains Mono, monospace" }}>O(2ⁿ)</span>
      </div>
      <div style={{ height: 6, background: "#111827", borderRadius: 99, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #34d399, #fbbf24, #f87171, #dc2626)", borderRadius: 99, opacity: 0.15 }} />
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, boxShadow: `0 0 8px ${color}80`, transition: "width .5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {SCALE.map((s, i) => (
          <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: i <= idx ? color : "#1e2535" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MathBlock({ steps, accent }: { steps: string[]; accent: string }) {
  if (!steps.length) return null;
  return (
    <div style={{ marginTop: 14, background: "#070a10", border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: accent, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <span>∑</span> Derivation
      </div>
      {steps.map((line, i) => {
        if (line === "") return <div key={i} style={{ height: 7 }} />;
        const isConclusion = line.trimStart().startsWith("∴");
        const isIndented   = line.startsWith("  ") || line.startsWith("\t");
        return (
          <div key={i} style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 12.5, lineHeight: 1.85,
            paddingLeft: isIndented ? 18 : 0,
            color: isConclusion ? accent : "#94a3b8",
            fontWeight: isConclusion ? 700 : 400,
            marginBottom: isConclusion ? 1 : 0,
          }}>
            {isConclusion
              ? <span style={{ background: `${accent}18`, borderRadius: 5, padding: "1px 8px" }}>{line.trim()}</span>
              : line.trim()
            }
          </div>
        );
      })}
    </div>
  );
}

const CASE_META = {
  best:    { label: "Best Case",    icon: "⚡", accent: "#34d399", border: "rgba(52,211,153,.2)",   bg: "rgba(52,211,153,.06)"  },
  average: { label: "Average Case", icon: "⚖",  accent: "#fbbf24", border: "rgba(251,191,36,.2)",   bg: "rgba(251,191,36,.06)"  },
  worst:   { label: "Worst Case",   icon: "🐢", accent: "#f87171", border: "rgba(248,113,113,.2)",  bg: "rgba(248,113,113,.06)" },
} as const;
type CaseKey = keyof typeof CASE_META;

interface Props { data: ComplexityData | null; topicId: string; }

export default function ComplexityPanel({ data, topicId }: Props) {
  const [activeCase, setActiveCase] = useState<CaseKey>("worst");

  if (!data) return null;

  const math = MATH[topicId] ?? {};
  const tc   = data.time_complexity ?? {};
  const sc   = data.space_complexity ?? {};

  const getVal    = (c: string) => str(math.time?.[c]?.value  ?? (tc as Record<string, unknown>)[c]);
  const getSteps  = (c: string) => math.time?.[c]?.steps ?? [];
  const getReason = (c: string) => str((tc as Record<string, unknown>)[`${c}_reasoning`]);

  const spaceVal    = str(math.space?.value ?? sc.value);
  const spaceSteps  = math.space?.steps ?? [];
  const spaceReason = str(sc.reasoning);
  const recurrence  = math.recurrence ?? data.recurrence_relation;

  const caseVal   = getVal(activeCase);
  const caseSteps = getSteps(activeCase);
  const caseReason= getReason(activeCase);
  const cm        = CASE_META[activeCase];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* ── Recurrence relation ── */}
      {recurrence && (
        <div style={{ padding: "14px 20px", marginBottom: 20, borderRadius: 12, background: "rgba(129,140,248,.06)", border: "1px solid rgba(129,140,248,.2)", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(129,140,248,.15)", border: "1px solid rgba(129,140,248,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#a5b4fc", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>ƒ</div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "#818cf8", marginBottom: 4 }}>Recurrence Relation</div>
            <code style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 15, fontWeight: 700, color: "#c4b5fd" }}>{recurrence}</code>
          </div>
        </div>
      )}

      {/* ── Summary strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {(["best","average","worst"] as CaseKey[]).map(c => {
          const m   = CASE_META[c];
          const val = getVal(c);
          const active = activeCase === c;
          return (
            <button key={c} onClick={() => setActiveCase(c)} style={{ padding: "14px 12px", borderRadius: 12, border: `1px solid ${active ? m.accent + "55" : "#1e2535"}`, background: active ? m.bg : "#0d1117", cursor: "pointer", textAlign: "left", transition: "all .15s", outline: "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: active ? m.accent : "#334155", marginBottom: 6 }}>{m.icon} {m.label}</div>
              <ComplexityBadge value={val} size="md" />
              <ComplexityBar value={val} />
            </button>
          );
        })}

        {/* Space */}
        <div style={{ padding: "14px 12px", borderRadius: 12, border: "1px solid rgba(96,165,250,.2)", background: "rgba(96,165,250,.05)", textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#60a5fa", marginBottom: 6 }}>🗂 Space</div>
          <ComplexityBadge value={spaceVal} size="md" />
          <ComplexityBar value={spaceVal} />
        </div>
      </div>

      {/* ── Active case detail ── */}
      <div style={{ background: "#0d1117", border: `1px solid ${cm.border}`, borderTop: `3px solid ${cm.accent}`, borderRadius: 14, padding: "22px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: cm.accent, marginBottom: 8 }}>{cm.icon} {cm.label} — Time Complexity</div>
            <ComplexityBadge value={caseVal} size="lg" />
          </div>
          {/* Case tabs */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            {(["best","average","worst"] as CaseKey[]).map(c => (
              <button key={c} onClick={() => setActiveCase(c)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${activeCase === c ? CASE_META[c].accent + "44" : "#1e2535"}`, background: activeCase === c ? CASE_META[c].accent + "15" : "transparent", color: activeCase === c ? CASE_META[c].accent : "#334155", cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all .15s" }}>
                {CASE_META[c].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {caseReason && <p style={{ fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 1.7 }}>{caseReason}</p>}
        {caseSteps.length > 0 && <MathBlock steps={caseSteps} accent={cm.accent} />}
      </div>

      {/* ── Space complexity detail ── */}
      <div style={{ background: "#0d1117", border: "1px solid rgba(96,165,250,.2)", borderTop: "3px solid #60a5fa", borderRadius: 14, padding: "22px 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#60a5fa", marginBottom: 8 }}>🗂 Space Complexity</div>
        <ComplexityBadge value={spaceVal} size="lg" />
        {spaceReason && <p style={{ fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 1.7 }}>{spaceReason}</p>}
        {spaceSteps.length > 0 && <MathBlock steps={spaceSteps} accent="#60a5fa" />}
      </div>

      {/* ── Comparison table ── */}
      {Array.isArray(data.comparison_to_alternatives) && data.comparison_to_alternatives.length > 0 && (
        <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e2535", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569" }}>⚖ Comparison to Alternatives</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#070a10" }}>
                {["Algorithm","Time","Notes"].map(h => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#334155", borderBottom: "1px solid #1e2535" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.comparison_to_alternatives.map((item, i) => (
                <tr key={i} style={{ borderBottom: i < data.comparison_to_alternatives!.length - 1 ? "1px solid #111827" : "none" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,.02)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 20px", fontWeight: 600, color: "#e2e8f0" }}>{str(item.algorithm)}</td>
                  <td style={{ padding: "12px 20px" }}>
                    <ComplexityBadge value={str(item.time)} size="sm" />
                  </td>
                  <td style={{ padding: "12px 20px", color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{str(item.notes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Practical notes ── */}
      {data.practical_notes && (
        <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderLeft: "3px solid #818cf8", borderRadius: 12, padding: "18px 22px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#818cf8", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💡</span> Practical Notes
          </div>
          <p style={{ fontSize: 13.5, color: "#94a3b8", lineHeight: 1.8, margin: 0 }}>{str(data.practical_notes)}</p>
        </div>
      )}
    </div>
  );
}
