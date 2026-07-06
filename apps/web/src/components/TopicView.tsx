"use client";

import { useState, useEffect, Component, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getResources } from "@/data/resources";
import LearnDiagram from "./LearnDiagram";
import AnimationPanel from "./AnimationPanel";
import CodePanel from "./CodePanel";
import ComplexityPanel from "./ComplexityPanel";
import QuizPanel from "./QuizPanel";
import TopicGraph from "./TopicGraph";
import { RICH_CONTENT, RELATED_QUESTIONS } from "@/data/topic_content";
import type { Topic, ExplainData, PseudocodeData, ComplexityData, RecommendationItem } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TabData {
  learn: ExplainData | null;
  code: PseudocodeData | null;
  complexity: ComplexityData | null;
}

interface CacheEntry {
  data: TabData;
  errors: Record<string, string>;
}

interface RelatedStructure {
  icon: string;
  name: string;
  role: string;
  topicId?: string;
}

interface StructureColor {
  border: string;
  bg: string;
  badge: string;
  text: string;
}

const TABS = [
  { id: "learn",      label: "Learn" },
  { id: "animate",    label: "Animate" },
  { id: "code",       label: "Code" },
  { id: "complexity", label: "Complexity" },
  { id: "quiz",       label: "Quiz" },
  { id: "graph",      label: "Road Map" },
] as const;

type TabId = typeof TABS[number]["id"];

const globalCache: Record<string, CacheEntry> = {};

const str = (v: unknown): string =>
  typeof v === "string" ? v : v ? String(v) : "";

// ── Error Boundary ────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode; boundary: string }, { error: string | null }> {
  constructor(props: { children: ReactNode; boundary: string }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error)
      return <div className="error-msg" style={{ marginTop: 16 }}>Render error: {this.state.error}</div>;
    return this.props.children;
  }
}

// ── Related Structures data ───────────────────────────────────────────────────

const RELATED_STRUCTURES: Record<string, RelatedStructure[]> = {
  binary_search: [
    { icon: "▦", name: "Array", role: "Stores the sorted data. Random index access makes halving the search range possible in O(1)." },
    { icon: "⇔", name: "Pointer / Index", role: "Three integer indices — left, right, and mid — track the current search window and shrink it each step." },
  ],
  two_pointers: [
    { icon: "▦", name: "Array / String", role: "The sequence both pointers walk over. Contiguous memory lets each pointer jump to any position in O(1)." },
    { icon: "⇔", name: "Pointer / Index", role: "Two indices start at opposite ends and converge toward the answer." },
  ],
  bubble_sort: [
    { icon: "▦", name: "Array", role: "Sorted in-place. Adjacent elements are compared and swapped directly using index arithmetic." },
  ],
  merge_sort: [
    { icon: "▦", name: "Array", role: "Both the input and the merged output live in arrays. Subarrays are identified by start/end indices." },
    { icon: "⟲", name: "Recursion Stack", role: "Each recursive call divides the array in half. The call stack grows O(log n) deep." },
    { icon: "⬚", name: "Auxiliary Array", role: "A temporary array holds merged results before they're written back — O(n) extra space." },
  ],
  quick_sort: [
    { icon: "▦", name: "Array", role: "Partitioned in-place around a pivot. Elements smaller than the pivot move left; larger ones move right." },
    { icon: "⟲", name: "Recursion Stack", role: "Best/average depth is O(log n); worst-case reaches O(n)." },
  ],
  bfs: [
    { icon: "⇥", name: "Queue", role: "FIFO ordering ensures nodes are visited level by level.", topicId: "stack_queue" },
    { icon: "◈", name: "Binary Tree", role: "BFS is the standard level-order traversal for trees.", topicId: "binary_tree" },
    { icon: "⬡", name: "Hash Map", role: "Tracks visited nodes to prevent revisiting.", topicId: "hash_map" },
  ],
  dfs: [
    { icon: "⇧", name: "Stack & Queue", role: "Implicit (call stack) or explicit stack for iterative DFS.", topicId: "stack_queue" },
    { icon: "◈", name: "Binary Tree", role: "DFS is the primary way to traverse and process tree nodes.", topicId: "binary_tree" },
    { icon: "⬡", name: "Hash Map", role: "Visited set prevents revisiting nodes in graphs.", topicId: "hash_map" },
  ],
  fibonacci_dp: [
    { icon: "▦", name: "Array (DP Table)", role: "Tabulation stores every fib(n) from 0 upward. Each new value is O(1) to compute." },
    { icon: "⬡", name: "Hash Map", role: "Used in the memoization approach — maps each n to its cached result.", topicId: "hash_map" },
  ],
  knapsack: [
    { icon: "⊞", name: "2D Array (DP Table)", role: "Rows represent items; columns represent capacity from 0 to W." },
  ],
  linked_list: [
    { icon: "○→", name: "Node", role: "The fundamental unit — stores a value and a pointer to the next node." },
    { icon: "⇔", name: "Pointer", role: "head, current, and prev pointers navigate and mutate the list." },
  ],
  binary_tree: [
    { icon: "⊤", name: "Tree Node", role: "Each node holds a value plus left and right child pointers." },
    { icon: "⇧", name: "Stack & Queue", role: "Stack for iterative DFS; Queue for level-order BFS.", topicId: "stack_queue" },
    { icon: "⬡", name: "Hash Map", role: "Used to cache node states during traversal.", topicId: "hash_map" },
  ],
  hash_map: [
    { icon: "▦", name: "Array (Bucket Array)", role: "The hash function maps each key to a bucket index." },
    { icon: "○→", name: "Linked List", role: "Each bucket holds a linked list to handle hash collisions via chaining.", topicId: "linked_list" },
    { icon: "ƒ", name: "Hash Function", role: "Converts any key into a fixed-range integer index." },
  ],
  sliding_window: [
    { icon: "▦", name: "Array / String", role: "The sequence the window slides over." },
    { icon: "⇔", name: "Two Pointers", role: "left and right pointers define window boundaries.", topicId: "two_pointers" },
    { icon: "⬡", name: "Hash Map", role: "Tracks element frequencies inside the window.", topicId: "hash_map" },
  ],
  stack_queue: [
    { icon: "▦", name: "Array", role: "Array-backed implementation gives O(1) push/pop." },
    { icon: "○→", name: "Linked List", role: "Linked-list-backed implementation supports O(1) insertions at either end.", topicId: "linked_list" },
    { icon: "⇔", name: "Pointer / Index", role: "top index or front+rear indices track read/write positions." },
  ],
};

const STRUCTURE_COLORS: StructureColor[] = [
  { border: "#818cf8", bg: "rgba(129,140,248,.08)", badge: "rgba(129,140,248,.18)", text: "#a5b4fc" },
  { border: "#34d399", bg: "rgba(52,211,153,.08)",  badge: "rgba(52,211,153,.18)",  text: "#6ee7b7" },
  { border: "#f59e0b", bg: "rgba(245,158,11,.08)",  badge: "rgba(245,158,11,.18)",  text: "#fcd34d" },
  { border: "#60a5fa", bg: "rgba(96,165,250,.08)",  badge: "rgba(96,165,250,.18)",  text: "#93c5fd" },
  { border: "#f472b6", bg: "rgba(244,114,182,.08)", badge: "rgba(244,114,182,.18)", text: "#f9a8d4" },
];

const TOPIC_META: Record<string, { name: string; description: string }> = {
  binary_search:  { name: "Binary Search",    description: "Find element in sorted array in O(log n)" },
  two_pointers:   { name: "Two Pointers",      description: "Use two indices to solve array problems efficiently" },
  bubble_sort:    { name: "Bubble Sort",        description: "Simple comparison-based sorting algorithm" },
  merge_sort:     { name: "Merge Sort",         description: "Divide-and-conquer O(n log n) sorting" },
  quick_sort:     { name: "Quick Sort",         description: "In-place divide-and-conquer sorting" },
  bfs:            { name: "BFS",                description: "Breadth-first graph/tree traversal using a queue" },
  dfs:            { name: "DFS",                description: "Depth-first graph/tree traversal using recursion/stack" },
  fibonacci_dp:   { name: "Fibonacci (DP)",     description: "Memoization and tabulation for overlapping subproblems" },
  knapsack:       { name: "0/1 Knapsack",       description: "Classic DP problem: maximize value under weight constraint" },
  linked_list:    { name: "Linked List",        description: "Singly/doubly linked list operations" },
  binary_tree:    { name: "Binary Tree",        description: "Tree traversals and basic operations" },
  hash_map:       { name: "Hash Map",           description: "Key-value store with O(1) average operations" },
  sliding_window: { name: "Sliding Window",     description: "Fixed/variable window technique for subarrays" },
  stack_queue:    { name: "Stack & Queue",      description: "LIFO/FIFO abstract data types" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function MistakeAccordion({ index, mistake }: { index: number; mistake: { title: string; description: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, overflow: "hidden", marginBottom: 8, background: open ? "rgba(239,68,68,.04)" : "transparent", transition: "background .2s" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(239,68,68,.15)", color: "#f87171", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "JetBrains Mono, monospace" }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 13 }}>{mistake.title}</span>
        </span>
        <span style={{ color: "#f87171", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }}>▾</span>
      </button>
      {open && mistake.description && (
        <div style={{ borderTop: "1px solid rgba(239,68,68,.12)", padding: "12px 16px 14px 56px" }}>
          <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.75, margin: 0 }}>{mistake.description}</p>
        </div>
      )}
    </div>
  );
}

function PrerequisiteCard({ name }: { name: string }) {
  const resources = getResources(name);
  return (
    <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 8 }}>{name}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {resources.youtube.slice(0, 2).map((v: { url: string; title: string }, i: number) => (
          <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(239,68,68,.08)", color: "#fca5a5", textDecoration: "none", border: "1px solid rgba(239,68,68,.15)" }}>
            ▶ {v.title}
          </a>
        ))}
        {resources.blogs.slice(0, 2).map((b: { url: string; title: string }, i: number) => (
          <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: "rgba(59,130,246,.08)", color: "#93c5fd", textDecoration: "none", border: "1px solid rgba(59,130,246,.15)" }}>
            ↗ {b.title}
          </a>
        ))}
      </div>
    </div>
  );
}

function RelatedStructureCard({ structure, color, onTopicSelect }: { structure: RelatedStructure; color: StructureColor; onTopicSelect: (t: Topic) => void }) {
  const [open, setOpen] = useState(false);
  const { icon, name, role, topicId } = structure;
  const c = color;
  const resources = getResources(name);
  const topicMeta = topicId ? TOPIC_META[topicId] : null;

  return (
    <div style={{ border: `1px solid ${c.border}33`, borderRadius: 10, overflow: "hidden", borderLeft: `3px solid ${c.border}` }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: c.bg, border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 32, height: 32, borderRadius: 8, background: c.badge, color: c.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>
            {icon}
          </span>
          <span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", display: "block" }}>{name}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{role}</span>
          </span>
        </span>
        <span style={{ color: c.text, fontSize: 14, marginLeft: 12, flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>
      {open && (
        <div style={{ background: "var(--bg-card)", borderTop: `1px solid ${c.border}22`, padding: "14px 16px" }}>
          {topicMeta && (
            <button
              onClick={() => onTopicSelect({ id: topicId!, ...topicMeta, category: "", difficulty: "intermediate" })}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", marginBottom: 14, borderRadius: 8, background: c.badge, border: `1px solid ${c.border}55`, color: c.text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              <span style={{ fontSize: 16 }}>→</span>
              Open &ldquo;{topicMeta.name}&rdquo; topic in AlgoMentor
            </button>
          )}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#f87171", marginBottom: 6 }}>📺 YouTube</div>
            {resources.youtube.map((v: { url: string; title: string }, i: number) => (
              <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 4, borderRadius: 6, background: "rgba(239,68,68,.07)", color: "#fca5a5", fontSize: 13, textDecoration: "none", border: "1px solid rgba(239,68,68,.15)" }}>
                <span style={{ fontSize: 16 }}>▶</span>{v.title}
              </a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#60a5fa", marginBottom: 6 }}>📖 Articles &amp; Blogs</div>
            {resources.blogs.map((b: { url: string; title: string }, i: number) => (
              <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 4, borderRadius: 6, background: "rgba(59,130,246,.07)", color: "#93c5fd", fontSize: 13, textDecoration: "none", border: "1px solid rgba(59,130,246,.15)" }}>
                <span style={{ fontSize: 14 }}>↗</span>{b.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RelatedStructuresSection({ topicId, onTopicSelect }: { topicId: string; onTopicSelect: (t: Topic) => void }) {
  const structures = RELATED_STRUCTURES[topicId];
  if (!structures?.length) return null;
  return (
    <div className="card section-card">
      <h3>Related Data Structures</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        These structures power this algorithm — click any card to explore resources or jump to its topic.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {structures.map((s, i) => (
          <RelatedStructureCard key={i} structure={s} color={STRUCTURE_COLORS[i % STRUCTURE_COLORS.length]} onTopicSelect={onTopicSelect} />
        ))}
      </div>
    </div>
  );
}

// ── ExplanationView ───────────────────────────────────────────────────────────

/* Shared style helpers */
const S = {
  card: (accent?: string): React.CSSProperties => ({
    background: "#0d1117",
    border: `1px solid ${accent ? accent + "33" : "#1e2535"}`,
    borderLeft: accent ? `3px solid ${accent}` : "1px solid #1e2535",
    borderRadius: 12,
    padding: "20px 22px",
    marginBottom: 14,
  }),
  sectionLabel: (color = "#64748b"): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 7,
    fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: ".09em", color, marginBottom: 12,
  }),
  dot: (color: string): React.CSSProperties => ({
    width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
  }),
};

function ExplanationView({ data, topicId, onTopicSelect }: { data: ExplainData; topicId: string; onTopicSelect: (t: Topic) => void }) {
  const [showCode, setShowCode] = useState(false);
  const fb = (RICH_CONTENT as Record<string, ExplainData>)[topicId] ?? {};
  const rq = (RELATED_QUESTIONS as Record<string, { title: string; difficulty: string; description: string }[]>)[topicId] ?? [];

  const introText     = str(data.introduction)   || str(data.summary)      || str(fb.introduction);
  const intuitionText = str(data.intuition)       || str(fb.intuition);
  const howItWorks    = (Array.isArray(data.how_it_works) && data.how_it_works.length > 0 ? data.how_it_works : null) || (Array.isArray(fb.how_it_works) ? fb.how_it_works : []);
  const workedExample = (data.worked_example?.steps) ? data.worked_example : fb.worked_example;
  const codeSnippet   = str(data.code)            || str(fb.code);
  const advantages    = (Array.isArray(data.advantages)    && data.advantages.length    > 0 ? data.advantages    : null) || (Array.isArray(data.when_to_use)     && data.when_to_use.length     > 0 ? data.when_to_use     : null) || (Array.isArray(fb.advantages)    ? fb.advantages    : []);
  const disadvantages = (Array.isArray(data.disadvantages) && data.disadvantages.length > 0 ? data.disadvantages : null) || (Array.isArray(data.when_not_to_use) && data.when_not_to_use.length > 0 ? data.when_not_to_use : null) || (Array.isArray(fb.disadvantages) ? fb.disadvantages : []);
  const applications  = (Array.isArray(data.applications)  && data.applications.length  > 0 ? data.applications  : null) || (Array.isArray(fb.applications)  ? fb.applications  : []);
  const rawMistakes   = (Array.isArray(data.common_mistakes) && data.common_mistakes.length > 0 ? data.common_mistakes : null) || (Array.isArray(fb.common_mistakes) ? fb.common_mistakes : []);
  const commonMistakes = (rawMistakes as (string | { title?: string; description?: string; why?: string; fix?: string })[]).map((m) =>
    typeof m === "string" ? { title: m, description: "" } : { title: str(m.title), description: str(m.description) || str(m.why) || str(m.fix) || "" }
  );
  const tips          = (Array.isArray(data.tips) && data.tips.length > 0 ? data.tips : null) || (Array.isArray(fb.tips) ? fb.tips : []);
  const funFact       = str(data.fun_fact)        || str(fb.fun_fact);
  const prerequisites = Array.isArray(data.prerequisites) ? data.prerequisites : [];

  return (
    <div style={{ color: "#e2e8f0" }}>

      {/* ── Introduction ── */}
      {introText && (
        <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,.07) 0%, rgba(34,211,238,.04) 100%)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 14, padding: "22px 24px", marginBottom: 14 }}>
          <div style={S.sectionLabel("#818cf8")}>
            <span style={S.dot("#818cf8")} />Introduction
          </div>
          <p style={{ lineHeight: 1.9, fontSize: 14, color: "#cbd5e1", margin: 0 }}>{introText}</p>
        </div>
      )}

      {/* ── Intuition ── */}
      {intuitionText && (
        <div style={S.card("#f59e0b")}>
          <div style={S.sectionLabel("#fbbf24")}>
            <span style={{ fontSize: 14 }}>💡</span>The Intuition
          </div>
          <p style={{ lineHeight: 1.9, fontSize: 14, color: "#e2e8f0", margin: 0, fontStyle: "italic" }}>{intuitionText}</p>
        </div>
      )}

      {/* ── How It Works ── */}
      {howItWorks.length > 0 && (
        <div style={S.card()}>
          <div style={S.sectionLabel("#818cf8")}>
            <span style={S.dot("#818cf8")} />How It Works
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {howItWorks.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 16, position: "relative" }}>
                {/* connecting line */}
                {i < howItWorks.length - 1 && (
                  <div style={{ position: "absolute", left: 15, top: 32, bottom: 0, width: 1, background: "rgba(99,102,241,.2)" }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 10, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#818cf8", zIndex: 1, marginTop: 2 }}>
                    {i + 1}
                  </div>
                </div>
                <div style={{ paddingBottom: i < howItWorks.length - 1 ? 18 : 4 }}>
                  <p style={{ fontSize: 13.5, color: "#e2e8f0", lineHeight: 1.75, margin: 0 }}>{str(step)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Worked Example ── */}
      {workedExample && (
        <div style={S.card()}>
          <div style={S.sectionLabel("#22d3ee")}>
            <span style={{ fontSize: 14 }}>🔬</span>{str(workedExample.label) || "Worked Example"}
          </div>
          <div style={{ background: "#070a10", borderRadius: 10, overflow: "hidden", border: "1px solid #1e2535" }}>
            <div style={{ padding: "8px 14px", background: "#0d1117", borderBottom: "1px solid #1e2535", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 11, color: "#475569", marginLeft: 8, fontFamily: "JetBrains Mono, monospace" }}>trace</span>
            </div>
            <pre style={{ margin: 0, padding: "16px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#94a3b8", lineHeight: 1.9, overflowX: "auto", whiteSpace: "pre" }}>
              {workedExample.steps?.map((s) => str(s)).join("\n") ?? ""}
            </pre>
          </div>
          {workedExample.result && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", borderRadius: 8, fontSize: 13, color: "#4ade80", fontFamily: "JetBrains Mono, monospace" }}>
              Result → {str(workedExample.result)}
            </div>
          )}
        </div>
      )}

      {/* ── Code Snippet ── */}
      {codeSnippet && (
        <div style={S.card()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={S.sectionLabel("#a78bfa")}>
              <span style={{ fontSize: 14 }}>🐍</span>Python
            </div>
            <button
              onClick={() => setShowCode((v) => !v)}
              style={{ fontSize: 11, color: "#64748b", background: "rgba(255,255,255,.04)", border: "1px solid #1e2535", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontWeight: 600, letterSpacing: ".03em" }}
            >
              {showCode ? "HIDE" : "SHOW"}
            </button>
          </div>
          {showCode && (
            <div style={{ background: "#070a10", borderRadius: 10, overflow: "hidden", border: "1px solid #1e2535" }}>
              <div style={{ padding: "8px 14px", background: "#0d1117", borderBottom: "1px solid #1e2535", display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 11, color: "#475569", marginLeft: 8, fontFamily: "JetBrains Mono, monospace" }}>solution.py</span>
              </div>
              <pre style={{ margin: 0, padding: "16px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#c8d0e8", lineHeight: 1.9, overflowX: "auto", whiteSpace: "pre" }}>
                {codeSnippet}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── Pros / Cons ── */}
      {(advantages.length > 0 || disadvantages.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          {advantages.length > 0 && (
            <div style={{ background: "#0d1117", border: "1px solid rgba(16,185,129,.2)", borderTop: "3px solid #10b981", borderRadius: 12, padding: "18px 20px" }}>
              <div style={S.sectionLabel("#34d399")}><span style={S.dot("#34d399")} />Advantages</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {advantages.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#e2e8f0", lineHeight: 1.65 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 6, background: "rgba(16,185,129,.15)", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✓</span>
                    {str(a)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {disadvantages.length > 0 && (
            <div style={{ background: "#0d1117", border: "1px solid rgba(239,68,68,.2)", borderTop: "3px solid #ef4444", borderRadius: 12, padding: "18px 20px" }}>
              <div style={S.sectionLabel("#f87171")}><span style={S.dot("#f87171")} />Disadvantages</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {disadvantages.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#e2e8f0", lineHeight: 1.65 }}>
                    <span style={{ width: 18, height: 18, borderRadius: 6, background: "rgba(239,68,68,.15)", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>✗</span>
                    {str(d)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Applications ── */}
      {applications.length > 0 && (
        <div style={S.card()}>
          <div style={S.sectionLabel("#60a5fa")}>
            <span style={{ fontSize: 14 }}>🌐</span>Real-World Applications
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {applications.map((app, i) => (
              <span key={i} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 99, background: "rgba(59,130,246,.08)", border: "1px solid rgba(59,130,246,.2)", color: "#93c5fd", fontWeight: 500 }}>
                {str(app)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Common Mistakes ── */}
      {commonMistakes.length > 0 && (
        <div style={S.card("#ef4444")}>
          <div style={S.sectionLabel("#f87171")}>
            <span style={{ fontSize: 14 }}>⚠️</span>Common Mistakes
          </div>
          {commonMistakes.map((m, i) => (
            <MistakeAccordion key={i} index={i} mistake={m} />
          ))}
        </div>
      )}

      {/* ── Pro Tips ── */}
      {tips.length > 0 && (
        <div style={S.card("#3b82f6")}>
          <div style={S.sectionLabel("#60a5fa")}>
            <span style={{ fontSize: 14 }}>⚡</span>Pro Tips
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tips.map((tip, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "rgba(59,130,246,.06)", borderRadius: 8, border: "1px solid rgba(59,130,246,.12)" }}>
                <span style={{ width: 22, height: 22, borderRadius: 7, background: "rgba(59,130,246,.15)", color: "#60a5fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.75 }}>{str(tip)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Visual Diagram ── */}
      <LearnDiagram topicId={topicId} />

      {/* ── Related Structures ── */}
      <RelatedStructuresSection topicId={topicId} onTopicSelect={onTopicSelect} />

      {/* ── Practice Questions ── */}
      {rq.length > 0 && (
        <div style={{ background: "#0d1117", border: "1px solid rgba(167,139,250,.2)", borderRadius: 14, padding: "20px 22px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={S.sectionLabel("#a78bfa")}>
              <span style={{ fontSize: 14 }}>🧩</span>Practice on LeetCode
            </div>
            <span style={{ fontSize: 11, color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>{rq.length} problems</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rq.map((q, i) => {
              const diffColor = q.difficulty === "Easy" ? "#4ade80" : q.difficulty === "Hard" ? "#f87171" : "#fbbf24";
              const diffBg    = q.difficulty === "Easy" ? "rgba(74,222,128,.1)" : q.difficulty === "Hard" ? "rgba(248,113,113,.1)" : "rgba(251,191,36,.1)";
              const lcSlug    = q.title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-");
              const lcUrl     = `https://leetcode.com/problems/${lcSlug}/`;
              return (
                <a key={i} href={lcUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#080b12", border: "1px solid #1e2535", borderRadius: 10, textDecoration: "none", transition: "border-color .15s, background .15s, transform .12s" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#6366f155"; el.style.background = "rgba(99,102,241,.06)"; el.style.transform = "translateX(2px)"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#1e2535"; el.style.background = "#080b12"; el.style.transform = "none"; }}
                >
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: "#334155", fontWeight: 700, minWidth: 24 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.4 }}>{q.description}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: diffBg, color: diffColor, border: `1px solid ${diffColor}33`, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {q.difficulty}
                  </span>
                  <span style={{ fontSize: 12, color: "#334155", flexShrink: 0 }}>↗</span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Fun Fact ── */}
      {funFact && (
        <div style={{ background: "rgba(16,185,129,.06)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 12, padding: "18px 22px", marginBottom: 14 }}>
          <div style={S.sectionLabel("#34d399")}>
            <span style={{ fontSize: 14 }}>🎲</span>Fun Fact
          </div>
          <p style={{ lineHeight: 1.9, fontSize: 14, color: "#e2e8f0", margin: 0 }}>{funFact}</p>
        </div>
      )}

      {/* ── Prerequisites ── */}
      {prerequisites.length > 0 && (
        <div style={S.card()}>
          <div style={S.sectionLabel("#64748b")}><span style={S.dot("#64748b")} />Prerequisites</div>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 12 }}>Study these first — click any card to find resources.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {prerequisites.map((p, i) => <PrerequisiteCard key={i} name={str(p)} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TopicView (main) ──────────────────────────────────────────────────────────

interface Props {
  topic: Topic;
  onTopicSelect: (t: Topic) => void;
}

const TAB_IDS = TABS.map(t => t.id);
const SS_TAB_KEY = (id: string) => `tab_${id}`;

export default function TopicView({ topic, onTopicSelect }: Props) {
  const [tab, setTab] = useState<TabId>("learn");
  const [tabData, setTabData] = useState<TabData>({ learn: null, code: null, complexity: null });
  const [tabErrors, setTabErrors] = useState<Record<string, string>>({});
  const [tabLoading, setTabLoading] = useState({ learn: true, code: true, complexity: true });
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const topicId = topic.id;

  const switchTab = (t: TabId) => {
    setTab(t);
    try { sessionStorage.setItem(SS_TAB_KEY(topicId), t); } catch {}
  };

  useEffect(() => {
    const saved = (() => {
      try { return sessionStorage.getItem(SS_TAB_KEY(topicId)); } catch { return null; }
    })();
    setTab((TAB_IDS.includes(saved as TabId) ? saved : "learn") as TabId);

    if (globalCache[topicId]) {
      setTabData(globalCache[topicId].data);
      setTabErrors(globalCache[topicId].errors ?? {});
      setTabLoading({ learn: false, code: false, complexity: false });
      api.saveProgress(topicId);
      return;
    }

    setTabData({ learn: null, code: null, complexity: null });
    setTabErrors({});
    setTabLoading({ learn: true, code: true, complexity: true });

    const results: CacheEntry = { data: { learn: null, code: null, complexity: null }, errors: {} };

    const doFetch = <K extends keyof TabData>(key: K, promise: Promise<TabData[K]>) =>
      promise
        .then((d) => {
          results.data[key] = d;
          setTabData((prev) => {
            const next = { ...prev, [key]: d };
            globalCache[topicId] = { data: next, errors: results.errors };
            return next;
          });
        })
        .catch((e: Error) => {
          results.errors[key] = e.message;
          setTabErrors((prev) => ({ ...prev, [key]: e.message }));
        })
        .finally(() => {
          setTabLoading((prev) => ({ ...prev, [key]: false }));
        });

    doFetch("learn", api.explain(topicId, topic.name));
    doFetch("code", api.getPseudocode(topicId));
    doFetch("complexity", api.getComplexity(topicId));
    api.saveProgress(topicId);

    // Fetch vector recommendations for this topic
    api.getRecommendations(topicId, 3)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [topicId, topic.name]);

  const TAB_ICONS: Record<string, string> = { learn: "📖", animate: "▶", code: "{ }", complexity: "⏱", quiz: "🧠" };

  return (
    <div>
      {/* ── Topic Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0, marginTop: 2,
            background: "linear-gradient(135deg, rgba(99,102,241,.25), rgba(34,211,238,.15))",
            border: "1px solid rgba(99,102,241,.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
          }}>
            {TAB_ICONS.learn}
          </div>
          <div>
            <h2 style={{
              fontSize: 26, fontWeight: 700, letterSpacing: "-.4px", margin: 0,
              background: "linear-gradient(135deg, #e2e8f0 0%, #818cf8 60%, #22d3ee 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>{topic.name}</h2>
            <p style={{ color: "#475569", marginTop: 5, fontSize: 14 }}>{topic.description}</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: "flex", gap: 2, padding: 4,
        background: "#0d1117", border: "1px solid #1e2535",
        borderRadius: 12, marginBottom: 28,
      }}>
        {TABS.map((t) => {
          const isActive = tab === t.id;
          const isLoading = tabLoading[t.id as keyof typeof tabLoading];
          return (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 12px", border: isActive ? "1px solid rgba(99,102,241,.3)" : "1px solid transparent",
                borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: isActive ? 600 : 500,
                background: isActive ? "linear-gradient(135deg, rgba(99,102,241,.18), rgba(34,211,238,.08))" : "transparent",
                color: isActive ? "#818cf8" : "#475569",
                transition: "all .15s",
              }}
            >
              <span style={{ fontSize: 13 }}>{TAB_ICONS[t.id]}</span>
              <span>{t.label}</span>
              {isLoading && t.id !== "animate" && t.id !== "quiz" && (
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", display: "inline-block", animation: "pulse 1s infinite" }} />
              )}
            </button>
          );
        })}
      </div>

      <ErrorBoundary boundary={tab + topicId}>
        {tab === "learn" && (
          <div>
            {tabLoading.learn && <div className="loading"><div className="spinner" /> Loading explanation for {topic.name}…</div>}
            {tabErrors.learn && <div className="error-msg">{tabErrors.learn}</div>}
            {tabData.learn && !tabLoading.learn && (
              <ExplanationView data={tabData.learn} topicId={topicId} onTopicSelect={onTopicSelect} />
            )}
          </div>
        )}
        {tab === "animate" && <AnimationPanel topic={topic} />}
        {tab === "code" && (
          <div>
            {tabLoading.code && <div className="loading"><div className="spinner" /> Loading code…</div>}
            {tabErrors.code && <div className="error-msg">{tabErrors.code}</div>}
            {tabData.code && !tabLoading.code && <CodePanel data={tabData.code} topicId={topicId} />}
          </div>
        )}
        {tab === "complexity" && (
          <div>
            {tabLoading.complexity && <div className="loading"><div className="spinner" /> Analyzing complexity…</div>}
            {tabErrors.complexity && <div className="error-msg">{tabErrors.complexity}</div>}
            {tabData.complexity && !tabLoading.complexity && <ComplexityPanel data={tabData.complexity} topicId={topicId} />}
          </div>
        )}
        {tab === "quiz" && <QuizPanel topic={topic} />}
        {tab === "graph" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "#475569" }}>
                Topic prerequisite graph for{" "}
                <strong style={{ color: "#e2e8f0" }}>{topic.category.replace(/_/g, " ")}</strong>.
                Click any node to navigate to it.
              </span>
            </div>
            <TopicGraph
              category={topic.category}
              currentTopicId={topicId}
              onTopicSelect={onTopicSelect}
              height={500}
            />
          </div>
        )}
      </ErrorBoundary>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: "1px solid #1e2535" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
              textTransform: "uppercase", color: "#475569",
            }}>
              You might also like
            </span>
            <div style={{ flex: 1, height: 1, background: "#1e2535" }} />
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
              background: "rgba(99,102,241,.1)", color: "#818cf8",
              border: "1px solid rgba(99,102,241,.2)",
            }}>
              similar topics
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {recommendations.map(r => (
              <div
                key={r.id}
                onClick={() => onTopicSelect({ id: r.id, name: r.name, description: r.description, category: r.category, difficulty: r.difficulty as Topic["difficulty"] })}
                style={{
                  padding: "16px 18px", background: "#0d1117",
                  border: "1px solid #1e2535", borderRadius: 12,
                  cursor: "pointer", transition: "all .18s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,.4)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,.4)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2535";
                  (e.currentTarget as HTMLDivElement).style.transform = "none";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 8 }}>
                  {({ binary_search:"🔎",two_pointers:"👇",sliding_window:"🪟",linked_list:"🔗",hash_map:"🗃️",stack_queue:"📚",binary_tree:"🌳",bfs:"🌊",dfs:"🕳️",bubble_sort:"🫧",merge_sort:"🔀",quick_sort:"⚡",fibonacci_dp:"🌀",knapsack:"🎒" } as Record<string,string>)[r.id] || "📌"}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#e2e8f0", marginBottom: 4 }}>{r.name}</div>
                <div style={{
                  fontSize: 11, color: "#475569", lineHeight: 1.5,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical" as const, overflow: "hidden",
                }}>
                  {r.description}
                </div>
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{
                    fontSize: 10, padding: "2px 7px", borderRadius: 99, fontWeight: 600,
                    background: "rgba(99,102,241,.1)", color: "#818cf8",
                    border: "1px solid rgba(99,102,241,.2)",
                  }}>
                    {r.reason ?? `${r.score}% match`}
                  </span>
                  <span style={{ fontSize: 11, color: "#334155" }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
