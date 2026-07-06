"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagramStep {
  label: string;
  array?: number[];
  colors?: Record<number, string>;
  pointers?: Record<number, string>;
  note: string;
  visited?: number[];
  queue?: number[];
  stack?: number[];
}

interface DiagramDef {
  title: string;
  array?: number[];
  steps: DiagramStep[];
  isTree?: boolean;
  isHashMap?: boolean;
}

// ── Diagram data ──────────────────────────────────────────────────────────────

const DIAGRAMS: Record<string, DiagramDef | null> = {
  two_pointers: {
    title: "Two Pointers — Find pair that sums to 9",
    array: [1, 3, 4, 5, 6, 7, 8, 9],
    steps: [
      { label: "Start: left=0, right=7", colors: { 0: "active", 7: "active" }, pointers: { 0: "L", 7: "R" }, note: "Place one pointer at start, one at end of the sorted array." },
      { label: "1+9 = 10 > 9 → move right left", colors: { 0: "active", 6: "active", 7: "comparing" }, pointers: { 0: "L", 6: "R" }, note: "Sum too large → shrink from the right." },
      { label: "1+8 = 9 > 9 → move right left", colors: { 0: "active", 5: "active", 6: "comparing" }, pointers: { 0: "L", 5: "R" }, note: "Still too large → move right pointer left again." },
      { label: "1+7 = 8 < 9 → move left right", colors: { 0: "comparing", 1: "active", 5: "active" }, pointers: { 1: "L", 5: "R" }, note: "Sum too small → grow from the left." },
      { label: "3+7 = 10 > 9 → move right left", colors: { 1: "active", 4: "active", 5: "comparing" }, pointers: { 1: "L", 4: "R" }, note: "Too large again → shrink right." },
      { label: "3+6 = 9 ✓ FOUND!", colors: { 1: "found", 4: "found" }, pointers: { 1: "L", 4: "R" }, note: "Sum equals target! Pair found at indices 1 and 4." },
    ],
  },
  binary_search: {
    title: "Binary Search — Find 7 in sorted array",
    array: [1, 3, 5, 7, 9, 11, 13],
    steps: [
      { label: "Start: L=0, R=6, mid=3", colors: { 0: "boundary", 3: "active", 6: "boundary" }, pointers: { 0: "L", 3: "M", 6: "R" }, note: "Check the middle element: arr[3]=7. Compare to target=7." },
      { label: "arr[3]=7 == target → FOUND!", colors: { 3: "found" }, pointers: { 3: "✓" }, note: "Middle element equals target. Found at index 3 in just 1 step!" },
    ],
  },
  bubble_sort: {
    title: "Bubble Sort — Sort [5, 3, 8, 1, 4]",
    array: [5, 3, 8, 1, 4],
    steps: [
      { label: "Pass 1: Compare arr[0]=5 and arr[1]=3", colors: { 0: "comparing", 1: "comparing" }, pointers: { 0: "i", 1: "i+1" }, note: "5 > 3 → swap them." },
      { label: "After swap → [3, 5, 8, 1, 4]", array: [3, 5, 8, 1, 4], colors: { 0: "sorted", 1: "active" }, pointers: {}, note: "Smaller element bubbled left." },
      { label: "Compare arr[1]=5 and arr[2]=8", array: [3, 5, 8, 1, 4], colors: { 1: "comparing", 2: "comparing" }, pointers: { 1: "i", 2: "i+1" }, note: "5 < 8 → no swap needed." },
      { label: "Compare arr[2]=8 and arr[3]=1", array: [3, 5, 8, 1, 4], colors: { 2: "comparing", 3: "comparing" }, pointers: { 2: "i", 3: "i+1" }, note: "8 > 1 → swap them." },
      { label: "Compare arr[3]=8 and arr[4]=4", array: [3, 5, 1, 8, 4], colors: { 3: "comparing", 4: "comparing" }, pointers: { 3: "i", 4: "i+1" }, note: "8 > 4 → swap. 8 has bubbled to end of pass 1." },
      { label: "End of Pass 1 → largest (8) is in place", array: [3, 5, 1, 4, 8], colors: { 4: "sorted" }, pointers: {}, note: "Largest element is now at the end." },
    ],
  },
  merge_sort: {
    title: "Merge Sort — Divide & Conquer",
    array: [5, 3, 8, 1],
    steps: [
      { label: "Original array", colors: {}, pointers: {}, note: "Start with the full unsorted array [5, 3, 8, 1]." },
      { label: "Divide: split into halves", colors: { 0: "active", 1: "active", 2: "merging", 3: "merging" }, pointers: { 0: "◀", 1: "▶", 2: "◀", 3: "▶" }, note: "Split [5,3] and [8,1]. Keep splitting until single elements." },
      { label: "Conquer: sort each half", array: [3, 5, 1, 8], colors: { 0: "active", 1: "active", 2: "merging", 3: "merging" }, pointers: {}, note: "[5,3] → [3,5] and [8,1] → [1,8]." },
      { label: "Merge: combine sorted halves", array: [1, 3, 5, 8], colors: { 0: "found", 1: "found", 2: "found", 3: "found" }, pointers: {}, note: "Result: [1,3,5,8] ✓" },
    ],
  },
  sliding_window: {
    title: "Sliding Window — Max sum subarray of size 3",
    array: [2, 1, 5, 1, 3, 2],
    steps: [
      { label: "Window 1: [2,1,5] → sum=8", colors: { 0: "active", 1: "active", 2: "active" }, pointers: { 0: "L", 2: "R" }, note: "First window covers index 0–2. Sum = 8." },
      { label: "Slide: remove arr[0], add arr[3]", colors: { 0: "comparing", 1: "active", 2: "active", 3: "active" }, pointers: { 1: "L", 3: "R" }, note: "New window [1,5,1] → sum = 7. O(1) update!" },
      { label: "Slide: remove arr[1], add arr[4]", colors: { 1: "comparing", 2: "active", 3: "active", 4: "active" }, pointers: { 2: "L", 4: "R" }, note: "New window [5,1,3] → sum = 9. New maximum!" },
      { label: "Slide: remove arr[2], add arr[5]", colors: { 2: "comparing", 3: "active", 4: "active", 5: "active" }, pointers: { 3: "L", 5: "R" }, note: "New window [1,3,2] → sum = 6. Max stays 9." },
      { label: "Done — max sum = 9 (window [5,1,3])", colors: { 2: "found", 3: "found", 4: "found" }, pointers: {}, note: "Sliding window scanned all subarrays in O(n)." },
    ],
  },
  bfs: {
    title: "BFS — Level-by-level tree traversal",
    isTree: true,
    steps: [
      { label: "Start at root node 1", visited: [1], queue: [1], note: "Add root to queue. Queue: [1]" },
      { label: "Visit 1 → enqueue children 2, 3", visited: [1], queue: [2, 3], note: "Dequeue 1, visit it. Add children 2 and 3." },
      { label: "Visit 2 → enqueue children 4, 5", visited: [1, 2], queue: [3, 4, 5], note: "Dequeue 2, visit it. Add children 4 and 5." },
      { label: "Visit 3 → enqueue child 6", visited: [1, 2, 3], queue: [4, 5, 6], note: "Dequeue 3, visit it. Add child 6." },
      { label: "Visit 4, 5, 6 — level complete", visited: [1, 2, 3, 4, 5, 6], queue: [], note: "All level-2 nodes visited. BFS order: 1→2→3→4→5→6" },
    ],
  },
  dfs: {
    title: "DFS — Depth-first tree traversal",
    isTree: true,
    steps: [
      { label: "Visit root 1, push children", visited: [1], stack: [3, 2], note: "Visit 1. Push right child 3 first, then left child 2." },
      { label: "Pop 2 → visit 2, push its children", visited: [1, 2], stack: [3, 5, 4], note: "Pop 2, visit it. Push 5 then 4." },
      { label: "Pop 4 → leaf node, no children", visited: [1, 2, 4], stack: [3, 5], note: "Pop 4, visit it. No children." },
      { label: "Pop 5 → leaf node", visited: [1, 2, 4, 5], stack: [3], note: "Pop 5, visit it." },
      { label: "Pop 3 → visit 3, push child 6", visited: [1, 2, 4, 5, 3], stack: [6], note: "Pop 3, visit it. Push 6." },
      { label: "Pop 6 → done!", visited: [1, 2, 4, 5, 3, 6], stack: [], note: "DFS order: 1→2→4→5→3→6." },
    ],
  },
  hash_map: {
    title: "Hash Map — Insert & Lookup",
    array: [0, 1, 2, 3, 4, 5, 6, 7],
    isHashMap: true,
    steps: [
      { label: "Insert key='apple' → hash(apple)%8 = 3", colors: { 3: "active" }, pointers: { 3: "apple" }, note: "Hash function maps 'apple' to bucket 3." },
      { label: "Insert key='banana' → hash(banana)%8 = 6", colors: { 3: "sorted", 6: "active" }, pointers: { 3: "apple", 6: "banana" }, note: "'banana' hashes to bucket 6. O(1) insertion!" },
      { label: "Insert key='cherry' → hash(cherry)%8 = 3 — collision!", colors: { 3: "comparing", 6: "sorted" }, pointers: { 3: "apple/cherry", 6: "banana" }, note: "'cherry' collides with 'apple'. Use chaining." },
      { label: "Lookup 'banana' → found in O(1)", colors: { 3: "sorted", 6: "found" }, pointers: { 3: "apple/cherry", 6: "banana ✓" }, note: "Hash → bucket → return value. Constant time!" },
    ],
  },
};

DIAGRAMS["two pointers"] = DIAGRAMS.two_pointers;

const TREE_NODES: Record<number, { x: number; y: number; children: number[] }> = {
  1: { x: 200, y: 30,  children: [2, 3] },
  2: { x: 100, y: 110, children: [4, 5] },
  3: { x: 300, y: 110, children: [6]    },
  4: { x: 50,  y: 190, children: []     },
  5: { x: 150, y: 190, children: []     },
  6: { x: 300, y: 190, children: []     },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function DiagramControls({ step, setStep, totalSteps }: { step: number; setStep: (s: number | ((p: number) => number)) => void; totalSteps: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button className="btn btn-secondary" onClick={() => setStep(0)} disabled={step === 0}>⏮</button>
      <button className="btn btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>‹ Prev</button>
      <span style={{ fontSize: 13, color: "var(--text-muted)", minWidth: 80, textAlign: "center" }}>{step + 1} / {totalSteps}</span>
      <button className="btn btn-secondary" onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))} disabled={step >= totalSteps - 1}>Next ›</button>
      <button className="btn btn-secondary" onClick={() => setStep(totalSteps - 1)} disabled={step >= totalSteps - 1}>⏭</button>
    </div>
  );
}

function TreeDiagram({ diagram, step, setStep, totalSteps, current }: { diagram: DiagramDef; step: number; setStep: (s: number | ((p: number) => number)) => void; totalSteps: number; current: DiagramStep }) {
  const visited = new Set(current.visited ?? []);
  const queue = current.queue ?? current.stack ?? [];
  return (
    <div className="card section-card">
      <h3 style={{ marginBottom: 4 }}>Visual Diagram</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{diagram.title}</p>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-light)", marginBottom: 12 }}>Step {step + 1}: {current.label}</div>
      <svg width="400" height="240" style={{ display: "block", maxWidth: "100%", marginBottom: 8 }}>
        {Object.entries(TREE_NODES).map(([id, node]) =>
          node.children.map((childId) => {
            const child = TREE_NODES[childId];
            return <line key={`${id}-${childId}`} x1={node.x} y1={node.y} x2={child.x} y2={child.y} stroke="var(--border)" strokeWidth="2" />;
          })
        )}
        {Object.entries(TREE_NODES).map(([id, node]) => {
          const nid = parseInt(id);
          const isVisited = visited.has(nid);
          const isInQueue = queue.includes(nid);
          const fill = isVisited ? "var(--primary)" : isInQueue ? "#f59e0b" : "var(--bg-card)";
          const stroke = isVisited ? "var(--primary)" : isInQueue ? "#f59e0b" : "var(--border)";
          return (
            <g key={id}>
              <circle cx={node.x} cy={node.y} r={22} fill={fill} stroke={stroke} strokeWidth="2" />
              <text x={node.x} y={node.y + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="600">{id}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, fontSize: 13 }}>
        <span style={{ color: "var(--text-muted)" }}>{current.stack !== undefined ? "Stack:" : "Queue:"}</span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", color: "#fbbf24" }}>[{queue.join(", ")}]</span>
        <span style={{ color: "var(--text-muted)", marginLeft: 12 }}>Visited:</span>
        <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--primary-light)" }}>[{Array.from(visited).join(" → ")}]</span>
      </div>
      <div style={{ padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>{current.note}</div>
      <DiagramControls step={step} setStep={setStep} totalSteps={totalSteps} />
    </div>
  );
}

function HashMapDiagram({ diagram, step, setStep, totalSteps, current }: { diagram: DiagramDef; step: number; setStep: (s: number | ((p: number) => number)) => void; totalSteps: number; current: DiagramStep }) {
  const buckets = diagram.array ?? [];
  return (
    <div className="card section-card">
      <h3 style={{ marginBottom: 4 }}>Visual Diagram</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{diagram.title}</p>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-light)", marginBottom: 14 }}>Step {step + 1}: {current.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14, maxWidth: 320 }}>
        {buckets.map((_, i) => {
          const colorClass = current.colors?.[i] ?? "default";
          const label = current.pointers?.[i];
          const bg = colorClass === "active" ? "rgba(108,99,255,.2)" : colorClass === "found" ? "rgba(34,197,94,.2)" : colorClass === "comparing" ? "rgba(245,158,11,.2)" : colorClass === "sorted" ? "rgba(59,130,246,.1)" : "var(--bg)";
          const border = colorClass === "active" ? "var(--primary)" : colorClass === "found" ? "var(--success)" : colorClass === "comparing" ? "var(--warning)" : colorClass === "sorted" ? "var(--info)" : "var(--border)";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, fontSize: 12, color: "var(--text-muted)", textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}>{i}</div>
              <div style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: `1px solid ${border}`, background: bg, fontSize: 13, minHeight: 36, color: label ? "var(--text)" : "transparent", transition: "all .25s" }}>{label ?? "—"}</div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>{current.note}</div>
      <DiagramControls step={step} setStep={setStep} totalSteps={totalSteps} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LearnDiagram({ topicId }: { topicId: string }) {
  const key = topicId?.toLowerCase().replace(/-/g, "_");
  const diagram = DIAGRAMS[key] ?? DIAGRAMS[key?.replace(/_/g, " ")] ?? null;

  const [step, setStep] = useState(0);

  if (!diagram) return null;

  const totalSteps = diagram.steps.length;
  const current = diagram.steps[step];
  const displayArray = current.array ?? diagram.array ?? [];

  if (diagram.isTree) return <TreeDiagram diagram={diagram} step={step} setStep={setStep} totalSteps={totalSteps} current={current} />;
  if (diagram.isHashMap) return <HashMapDiagram diagram={diagram} step={step} setStep={setStep} totalSteps={totalSteps} current={current} />;

  return (
    <div className="card section-card" style={{ marginTop: 4 }}>
      <h3 style={{ marginBottom: 4 }}>Visual Diagram</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{diagram.title}</p>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-light)", marginBottom: 12, minHeight: 22 }}>
        Step {step + 1}: {current.label}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "flex-end" }}>
        {displayArray.map((val, i) => {
          const colorClass = current.colors?.[i] ?? "default";
          const ptr = current.pointers?.[i];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              {ptr && <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-light)", minHeight: 16, whiteSpace: "nowrap" }}>{ptr}</div>}
              <div className={`cell-value ${colorClass}`} style={{ width: 48, height: 48, fontSize: 16 }}>{val}</div>
              <div className="cell-index">{i}</div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.6 }}>
        {current.note}
      </div>
      <DiagramControls step={step} setStep={setStep} totalSteps={totalSteps} />
    </div>
  );
}
