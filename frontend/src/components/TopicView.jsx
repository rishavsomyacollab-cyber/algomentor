import { useState, useEffect, Component } from "react";
import { api } from "../api/client";
import { getResources } from "../resources";
import LearnDiagram from "./LearnDiagram";
import AnimationPanel from "./AnimationPanel";
import CodePanel from "./CodePanel";
import ComplexityPanel from "./ComplexityPanel";
import QuizPanel from "./QuizPanel";
import { RICH_CONTENT, RELATED_QUESTIONS } from "../topic_content";

const TABS = [
  { id: "learn", label: "Learn" },
  { id: "animate", label: "Animate" },
  { id: "code", label: "Code" },
  { id: "complexity", label: "Complexity" },
  { id: "quiz", label: "Quiz" },
];

// Global cache so revisiting a topic is instant even after navigating away
const globalCache = {};

// Catches render errors so a bad AI response never blacks out the page
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e.message }; }
  render() {
    if (this.state.error)
      return <div className="error-msg" style={{ marginTop: 16 }}>Render error: {this.state.error}</div>;
    return this.props.children;
  }
}

export default function TopicView({ topic, onTopicSelect }) {
  const [tab, setTab] = useState("learn");
  const [tabData, setTabData] = useState({ learn: null, code: null, complexity: null });
  const [tabErrors, setTabErrors] = useState({});
  const [tabLoading, setTabLoading] = useState({ learn: true, code: true, complexity: true });
  const topicId = topic.id;

  useEffect(() => {
    setTab("learn");

    if (globalCache[topicId]) {
      setTabData(globalCache[topicId].data);
      setTabErrors(globalCache[topicId].errors || {});
      setTabLoading({ learn: false, code: false, complexity: false });
      api.saveProgress(topicId);
      return;
    }

    setTabData({ learn: null, code: null, complexity: null });
    setTabErrors({});
    setTabLoading({ learn: true, code: true, complexity: true });

    const results = { data: { learn: null, code: null, complexity: null }, errors: {} };

    const doFetch = (key, promise) =>
      promise
        .then((d) => {
          results.data[key] = d;
          setTabData((prev) => {
            const next = { ...prev, [key]: d };
            globalCache[topicId] = { data: next, errors: results.errors };
            return next;
          });
        })
        .catch((e) => {
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
  }, [topicId]);

  return (
    <div className="topic-view">
      <div className="topic-header">
        <h2>{topic.name}</h2>
        <p>{topic.description}</p>
      </div>

      <div className="tabs">
        {TABS.map((t) => {
          const isLoading = tabLoading[t.id];
          return (
            <button
              key={t.id}
              className={`tab-btn${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {isLoading && t.id !== "animate" && t.id !== "quiz" && (
                <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", marginLeft: 6, opacity: 0.8 }} />
              )}
            </button>
          );
        })}
      </div>

      <ErrorBoundary key={tab + topicId}>
        {tab === "learn" && (
          <div>
            {tabLoading.learn && (
              <div className="loading"><div className="spinner" /> Loading explanation for {topic.name}…</div>
            )}
            {tabErrors.learn && <div className="error-msg">{tabErrors.learn}</div>}
            {tabData.learn && !tabLoading.learn && <ExplanationView data={tabData.learn} topicId={topicId} onTopicSelect={onTopicSelect} />}
          </div>
        )}

        {tab === "animate" && <AnimationPanel topic={topic} />}

        {tab === "code" && (
          <div>
            {tabLoading.code && <div className="loading"><div className="spinner" /> Loading code…</div>}
            {tabErrors.code && <div className="error-msg">{tabErrors.code}</div>}
            {tabData.code && !tabLoading.code && <CodePanel data={tabData.code} />}
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
      </ErrorBoundary>
    </div>
  );
}

// Safe string helper — avoids crashes when model returns wrong types
const str = (v) => (typeof v === "string" ? v : v ? String(v) : "");

// Related data structures for each topic
const RELATED_STRUCTURES = {
  binary_search: [
    { icon: "▦", name: "Array", role: "Stores the sorted data. Random index access (arr[mid]) makes halving the search range possible in O(1)." },
    { icon: "⇔", name: "Pointer / Index", role: "Three integer indices — left, right, and mid — track the current search window and shrink it each step." },
  ],
  two_pointers: [
    { icon: "▦", name: "Array / String", role: "The sequence both pointers walk over. Contiguous memory lets each pointer jump to any position in O(1)." },
    { icon: "⇔", name: "Pointer / Index", role: "Two indices start at opposite ends (or both at the start for fast/slow variants) and converge toward the answer." },
  ],
  bubble_sort: [
    { icon: "▦", name: "Array", role: "Sorted in-place. Adjacent elements are compared and swapped directly using index arithmetic — no extra memory needed." },
  ],
  merge_sort: [
    { icon: "▦", name: "Array", role: "Both the input and the merged output live in arrays. Subarrays are identified by start/end indices." },
    { icon: "⟲", name: "Recursion Stack", role: "Each recursive call divides the array in half. The call stack grows O(log n) deep before the merge phase begins." },
    { icon: "⬚", name: "Auxiliary Array", role: "A temporary array holds merged results before they're written back, giving O(n) extra space per merge level." },
  ],
  quick_sort: [
    { icon: "▦", name: "Array", role: "Partitioned in-place around a pivot. Elements smaller than the pivot move left; larger ones move right." },
    { icon: "⟲", name: "Recursion Stack", role: "Recursive calls sort each partition. Best/average depth is O(log n); worst-case (already-sorted input) reaches O(n)." },
  ],
  bfs: [
    { icon: "⇥", name: "Queue", role: "FIFO ordering ensures nodes are visited level by level. Each dequeue gives the next node; neighbors are enqueued.", topicId: "stack_queue" },
    { icon: "◈", name: "Binary Tree", role: "BFS is the standard level-order traversal for trees — visits all nodes at depth d before d+1.", topicId: "binary_tree" },
    { icon: "⬡", name: "Hash Map", role: "Tracks visited nodes to prevent revisiting and infinite loops in graphs with cycles.", topicId: "hash_map" },
  ],
  dfs: [
    { icon: "⇧", name: "Stack & Queue", role: "Implicit (call stack) or explicit stack for iterative DFS. Enables backtracking to the last branch point.", topicId: "stack_queue" },
    { icon: "◈", name: "Binary Tree", role: "DFS (inorder/preorder/postorder) is the primary way to traverse and process tree nodes.", topicId: "binary_tree" },
    { icon: "⬡", name: "Hash Map", role: "Visited set prevents revisiting nodes in graphs — not needed for trees since there are no back edges.", topicId: "hash_map" },
  ],
  fibonacci_dp: [
    { icon: "▦", name: "Array (DP Table)", role: "Tabulation stores every fib(n) from 0 upward. Each new value is O(1) to compute from the previous two entries." },
    { icon: "⬡", name: "Hash Map", role: "Used in the memoization approach — maps each n to its cached result so repeated sub-calls return instantly.", topicId: "hash_map" },
  ],
  knapsack: [
    { icon: "⊞", name: "2D Array (DP Table)", role: "Rows represent items; columns represent capacity from 0 to W. Each cell stores the max value achievable with those constraints." },
  ],
  linked_list: [
    { icon: "○→", name: "Node", role: "The fundamental unit — stores a value and a pointer to the next node. Chains of nodes form the list." },
    { icon: "⇔", name: "Pointer", role: "head, current, and prev pointers navigate and mutate the list. No index arithmetic — all traversal is pointer-following." },
  ],
  binary_tree: [
    { icon: "⊤", name: "Tree Node", role: "Each node holds a value plus left and right child pointers. Null children mark leaf boundaries." },
    { icon: "⇧", name: "Stack & Queue", role: "Stack for iterative DFS traversals (inorder, preorder, postorder); Queue for level-order BFS traversal.", topicId: "stack_queue" },
    { icon: "⬡", name: "Hash Map", role: "Used to cache node states during traversal — e.g. tracking visited nodes or memoizing subtree results.", topicId: "hash_map" },
  ],
  hash_map: [
    { icon: "▦", name: "Array (Bucket Array)", role: "The hash function maps each key to a bucket index. A large array of buckets gives O(1) average lookup." },
    { icon: "○→", name: "Linked List", role: "Each bucket holds a linked list of (key, value) pairs to handle hash collisions via chaining.", topicId: "linked_list" },
    { icon: "ƒ", name: "Hash Function", role: "Converts any key into a fixed-range integer index. A good hash function distributes keys uniformly to minimize collisions." },
  ],
  sliding_window: [
    { icon: "▦", name: "Array / String", role: "The sequence the window slides over. Constant-time index access lets the window expand or contract in O(1)." },
    { icon: "⇔", name: "Two Pointers", role: "left and right pointers define the window boundaries — sliding window is essentially a specialised two-pointer technique.", topicId: "two_pointers" },
    { icon: "⬡", name: "Hash Map", role: "Tracks element frequencies inside the window — essential for 'longest substring without repeating characters' type problems.", topicId: "hash_map" },
  ],
  stack_queue: [
    { icon: "▦", name: "Array", role: "Array-backed implementation gives O(1) push/pop and fast cache performance. Fixed-size unless dynamically resized." },
    { icon: "○→", name: "Linked List", role: "Linked-list-backed implementation supports O(1) insertions at either end without pre-allocating capacity.", topicId: "linked_list" },
    { icon: "⇔", name: "Pointer / Index", role: "top index (stack) or front + rear indices (circular queue) track where to read from and write to." },
  ],
};

// Accordion item for Common Mistakes section (used inside ExplanationView)
function MistakeAccordion({ index, mistake }) {
  const [open, setOpen] = useState(false);
  const title = typeof mistake === "string" ? mistake : str(mistake.title);
  const description =
    typeof mistake === "string" ? "" : str(mistake.description || mistake.why || "");
  return (
    <div
      style={{
        border: "1px solid rgba(239,68,68,.25)",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(239,68,68,.07)",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "rgba(239,68,68,.2)",
              color: "#f87171",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <span style={{ color: "#e8eaf0", fontWeight: 600, fontSize: 14 }}>{title}</span>
        </span>
        <span
          style={{
            color: "#f87171",
            fontSize: 14,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        >
          ▾
        </span>
      </button>
      {open && description && (
        <div
          style={{
            background: "#1a1d27",
            borderTop: "1px solid rgba(239,68,68,.15)",
            padding: "12px 16px",
          }}
        >
          <p style={{ fontSize: 13, color: "#8b91a8", lineHeight: 1.7, margin: 0 }}>
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

function ExplanationView({ data, topicId, onTopicSelect }) {
  const [showCode, setShowCode] = useState(false);
  // LLM data is primary; RICH_CONTENT is fallback until Claude responds
  const fb = RICH_CONTENT[topicId] || {};

  // ── helpers — LLM fields first, hardcoded fallback second ─────────────────
  const introText = str(data.introduction) || str(data.summary) || str(fb.introduction);
  const intuitionText = str(data.intuition) || str(fb.intuition);
  const howItWorks =
    (Array.isArray(data.how_it_works) && data.how_it_works.length > 0 ? data.how_it_works : null) ||
    (Array.isArray(fb.how_it_works) ? fb.how_it_works : []);
  const workedExample = (data.worked_example && data.worked_example.steps) ? data.worked_example : fb.worked_example;
  const codeSnippet = str(data.code) || str(fb.code);
  const advantages = (Array.isArray(data.advantages) && data.advantages.length > 0 ? data.advantages : null) ||
    (Array.isArray(data.when_to_use) && data.when_to_use.length > 0 ? data.when_to_use : null) ||
    (Array.isArray(fb.advantages) ? fb.advantages : []);
  const disadvantages = (Array.isArray(data.disadvantages) && data.disadvantages.length > 0 ? data.disadvantages : null) ||
    (Array.isArray(data.when_not_to_use) && data.when_not_to_use.length > 0 ? data.when_not_to_use : null) ||
    (Array.isArray(fb.disadvantages) ? fb.disadvantages : []);
  const applications = (Array.isArray(data.applications) && data.applications.length > 0 ? data.applications : null) ||
    (Array.isArray(fb.applications) ? fb.applications : []);
  const rawMistakes = (Array.isArray(data.common_mistakes) && data.common_mistakes.length > 0 ? data.common_mistakes : null) ||
    (Array.isArray(fb.common_mistakes) ? fb.common_mistakes : []);
  // Normalise mistake shape: LLM may use {title,description} or {title,why,fix}
  const commonMistakes = rawMistakes.map(m =>
    typeof m === "string" ? { title: m, description: "" } :
    { title: str(m.title), description: str(m.description) || str(m.why) || str(m.fix) || "" }
  );
  const tips = (Array.isArray(data.tips) && data.tips.length > 0 ? data.tips : null) ||
    (Array.isArray(fb.tips) ? fb.tips : []);
  const funFact = str(data.fun_fact) || str(fb.fun_fact);
  const prerequisites = Array.isArray(data.prerequisites) ? data.prerequisites : [];
  const relatedQuestions = RELATED_QUESTIONS[topicId] || [];

  // ── shared style tokens ───────────────────────────────────────────────────
  const card = {
    background: "#1a1d27",
    border: "1px solid #2d3148",
    borderRadius: 12,
    padding: "18px 20px",
    marginBottom: 16,
  };
  const labelMuted = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".07em",
    color: "#8b91a8",
    marginBottom: 6,
  };

  return (
    <div style={{ color: "#e8eaf0" }}>

      {/* ── 2. Introduction Card ─────────────────────────────────────────── */}
      {introText && (
        <div style={{ ...card }}>
          <div style={labelMuted}>Introduction</div>
          <p
            style={{
              lineHeight: 1.85,
              fontSize: 14,
              color: "#e8eaf0",
              margin: 0,
            }}
          >
            {introText}
          </p>
        </div>
      )}

      {/* ── 3. Intuition Card ────────────────────────────────────────────── */}
      {intuitionText && (
        <div
          style={{
            ...card,
            borderLeft: "4px solid #f59e0b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                color: "#fbbf24",
              }}
            >
              Intuition
            </span>
          </div>
          <p style={{ lineHeight: 1.85, fontSize: 14, color: "#e8eaf0", margin: 0 }}>
            {intuitionText}
          </p>
        </div>
      )}

      {/* ── 4. How It Works ──────────────────────────────────────────────── */}
      {howItWorks.length > 0 && (
        <div style={card}>
          <div style={labelMuted}>How It Works</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {howItWorks.map((step, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <span
                  style={{
                    minWidth: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "rgba(108,99,255,.25)",
                    border: "1px solid rgba(108,99,255,.5)",
                    color: "#a5b4fc",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.75, color: "#e8eaf0" }}>
                  {str(step).replace(/^\d+\.\s*/, "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Worked Example ────────────────────────────────────────────── */}
      {workedExample && (
        <div
          style={{
            ...card,
            background: "#11131e",
            borderColor: "#2d3148",
          }}
        >
          <div style={labelMuted}>Worked Example</div>
          <div
            style={{
              fontSize: 13,
              color: "#8b91a8",
              marginBottom: 12,
              fontStyle: "italic",
            }}
          >
            {workedExample.label}
          </div>
          <div
            style={{
              background: "#0f1117",
              border: "1px solid #2d3148",
              borderRadius: 8,
              padding: "14px 16px",
              marginBottom: 10,
            }}
          >
            {workedExample.steps.map((step, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 12,
                  color: "#c8d0e8",
                  lineHeight: 1.9,
                  whiteSpace: "pre",
                }}
              >
                {step}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "rgba(34,197,94,.08)",
              border: "1px solid rgba(34,197,94,.2)",
              borderRadius: 8,
            }}
          >
            <span style={{ color: "#4ade80", fontSize: 14 }}>✓</span>
            <span
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 13,
                color: "#4ade80",
              }}
            >
              {workedExample.result}
            </span>
          </div>
        </div>
      )}

      {/* ── 6. Code Snippet ──────────────────────────────────────────────── */}
      {codeSnippet && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: showCode ? 14 : 0,
            }}
          >
            <div style={labelMuted}>Code Snippet (Python)</div>
            <button
              onClick={() => setShowCode((v) => !v)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #2d3148",
                background: showCode ? "rgba(108,99,255,.18)" : "#0f1117",
                color: showCode ? "#a5b4fc" : "#8b91a8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .15s",
              }}
            >
              {showCode ? "Hide Code" : "Show Code"}
            </button>
          </div>
          {showCode && (
            <pre
              style={{
                margin: 0,
                padding: "16px 18px",
                background: "#0f1117",
                border: "1px solid #2d3148",
                borderRadius: 8,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 12,
                color: "#c8d0e8",
                lineHeight: 1.8,
                overflowX: "auto",
                whiteSpace: "pre",
              }}
            >
              {codeSnippet}
            </pre>
          )}
        </div>
      )}

      {/* ── 8. Advantages & Disadvantages ────────────────────────────────── */}
      {(advantages.length > 0 || disadvantages.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {advantages.length > 0 && (
            <div
              style={{
                background: "#1a1d27",
                border: "1px solid #2d3148",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  color: "#4ade80",
                  marginBottom: 12,
                }}
              >
                Advantages
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {advantages.map((a, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                  >
                    <span style={{ color: "#4ade80", fontSize: 13, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: "#e8eaf0", lineHeight: 1.65 }}>
                      {str(a)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {disadvantages.length > 0 && (
            <div
              style={{
                background: "#1a1d27",
                border: "1px solid #2d3148",
                borderRadius: 12,
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                  color: "#f87171",
                  marginBottom: 12,
                }}
              >
                Disadvantages
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {disadvantages.map((d, i) => (
                  <div
                    key={i}
                    style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                  >
                    <span style={{ color: "#f87171", fontSize: 13, marginTop: 1 }}>✗</span>
                    <span style={{ fontSize: 13, color: "#e8eaf0", lineHeight: 1.65 }}>
                      {str(d)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 9. Applications ──────────────────────────────────────────────── */}
      {applications.length > 0 && (
        <div style={card}>
          <div style={labelMuted}>Applications</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {applications.map((app, i) => (
              <span
                key={i}
                style={{
                  padding: "5px 13px",
                  borderRadius: 99,
                  background: "rgba(108,99,255,.12)",
                  border: "1px solid rgba(108,99,255,.3)",
                  color: "#a5b4fc",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {str(app)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── 10. Common Mistakes Accordion ────────────────────────────────── */}
      {commonMistakes.length > 0 && (
        <div style={card}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              color: "#f87171",
              marginBottom: 12,
            }}
          >
            Common Mistakes
          </div>
          {commonMistakes.map((m, i) => (
            <MistakeAccordion key={i} index={i} mistake={m} />
          ))}
        </div>
      )}

      {/* ── 11. Pro Tips ─────────────────────────────────────────────────── */}
      {tips.length > 0 && (
        <div
          style={{
            ...card,
            borderLeft: "4px solid #3b82f6",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                color: "#60a5fa",
              }}
            >
              Pro Tips
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {tips.map((tip, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
              >
                <span
                  style={{
                    color: "#60a5fa",
                    fontSize: 14,
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  •
                </span>
                <span style={{ fontSize: 13, color: "#e8eaf0", lineHeight: 1.7 }}>
                  {str(tip)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 12. LearnDiagram (existing) ──────────────────────────────────── */}
      <LearnDiagram topicId={topicId} />

      {/* ── 13. RelatedStructuresSection (existing) ──────────────────────── */}
      <RelatedStructuresSection topicId={topicId} onTopicSelect={onTopicSelect} />

      {/* ── 14. Related Practice Questions ──────────────────────────────── */}
      {relatedQuestions.length > 0 && (
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 16 }}>🧩</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                color: "#a78bfa",
              }}
            >
              Practice Questions
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {relatedQuestions.map((q, i) => {
              const diffColor =
                q.difficulty === "Easy"
                  ? "#4ade80"
                  : q.difficulty === "Hard"
                  ? "#f87171"
                  : "#fbbf24";
              const diffBg =
                q.difficulty === "Easy"
                  ? "rgba(74,222,128,.12)"
                  : q.difficulty === "Hard"
                  ? "rgba(248,113,113,.12)"
                  : "rgba(251,191,36,.12)";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "11px 14px",
                    background: "#12141e",
                    border: "1px solid #2d3148",
                    borderRadius: 8,
                  }}
                >
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "rgba(167,139,250,.15)",
                      border: "1px solid rgba(167,139,250,.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#a78bfa",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#e8eaf0",
                        }}
                      >
                        {q.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 20,
                          background: diffBg,
                          color: diffColor,
                          border: `1px solid ${diffColor}44`,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                        }}
                      >
                        {q.difficulty}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#8b91a8", lineHeight: 1.5 }}>
                      {q.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 15. Fun Fact ─────────────────────────────────────────────────── */}
      {funFact && (
        <div
          style={{
            ...card,
            borderLeft: "4px solid #22c55e",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>🎲</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".07em",
                color: "#4ade80",
              }}
            >
              Fun Fact
            </span>
          </div>
          <p style={{ lineHeight: 1.85, fontSize: 14, color: "#e8eaf0", margin: 0 }}>
            {funFact}
          </p>
        </div>
      )}

      {/* ── 15. Prerequisites (existing PrerequisiteCard) ─────────────────── */}
      {prerequisites.length > 0 && (
        <div
          style={{
            background: "#1a1d27",
            border: "1px solid #2d3148",
            borderRadius: 12,
            padding: "18px 20px",
            marginBottom: 16,
          }}
        >
          <div style={labelMuted}>Prerequisites</div>
          <p style={{ fontSize: 13, color: "#8b91a8", marginBottom: 12 }}>
            Study these first — click any topic to find videos and articles.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {prerequisites.map((p, i) => (
              <PrerequisiteCard key={i} name={str(p)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const STRUCTURE_COLORS = [
  { border: "#818cf8", bg: "rgba(129,140,248,.08)", badge: "rgba(129,140,248,.18)", text: "#a5b4fc" },
  { border: "#34d399", bg: "rgba(52,211,153,.08)", badge: "rgba(52,211,153,.18)", text: "#6ee7b7" },
  { border: "#f59e0b", bg: "rgba(245,158,11,.08)", badge: "rgba(245,158,11,.18)", text: "#fcd34d" },
  { border: "#60a5fa", bg: "rgba(96,165,250,.08)", badge: "rgba(96,165,250,.18)", text: "#93c5fd" },
  { border: "#f472b6", bg: "rgba(244,114,182,.08)", badge: "rgba(244,114,182,.18)", text: "#f9a8d4" },
];

// Map topic_id → { name, description } for navigation
const TOPIC_META = {
  binary_search:  { name: "Binary Search",     description: "Find element in sorted array in O(log n)" },
  two_pointers:   { name: "Two Pointers",       description: "Use two indices to solve array problems efficiently" },
  bubble_sort:    { name: "Bubble Sort",         description: "Simple comparison-based sorting algorithm" },
  merge_sort:     { name: "Merge Sort",          description: "Divide-and-conquer O(n log n) sorting" },
  quick_sort:     { name: "Quick Sort",          description: "In-place divide-and-conquer sorting" },
  bfs:            { name: "BFS",                 description: "Breadth-first graph/tree traversal using a queue" },
  dfs:            { name: "DFS",                 description: "Depth-first graph/tree traversal using recursion/stack" },
  fibonacci_dp:   { name: "Fibonacci (DP)",      description: "Memoization and tabulation for overlapping subproblems" },
  knapsack:       { name: "0/1 Knapsack",        description: "Classic DP problem: maximize value under weight constraint" },
  linked_list:    { name: "Linked List",         description: "Singly/doubly linked list operations" },
  binary_tree:    { name: "Binary Tree",         description: "Tree traversals and basic operations" },
  hash_map:       { name: "Hash Map",            description: "Key-value store with O(1) average operations" },
  sliding_window: { name: "Sliding Window",      description: "Fixed/variable window technique for subarrays" },
  stack_queue:    { name: "Stack & Queue",       description: "LIFO/FIFO abstract data types" },
};

function RelatedStructuresSection({ topicId, onTopicSelect }) {
  const structures = RELATED_STRUCTURES[topicId];
  if (!structures || structures.length === 0) return null;

  return (
    <div className="card section-card">
      <h3>Related Data Structures</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
        These structures power this algorithm — click any card to explore resources or jump to its topic.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {structures.map((s, i) => (
          <RelatedStructureCard
            key={i}
            structure={s}
            color={STRUCTURE_COLORS[i % STRUCTURE_COLORS.length]}
            onTopicSelect={onTopicSelect}
          />
        ))}
      </div>
    </div>
  );
}

function RelatedStructureCard({ structure, color, onTopicSelect }) {
  const [open, setOpen] = useState(false);
  const { icon, name, role, topicId } = structure;
  const c = color;
  const resources = getResources(name);
  const topicMeta = topicId ? TOPIC_META[topicId] : null;

  return (
    <div style={{ border: `1px solid ${c.border}33`, borderRadius: 10, overflow: "hidden", borderLeft: `3px solid ${c.border}` }}>
      {/* Header row — always clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: c.bg, border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, background: c.badge, color: c.text,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontFamily: "JetBrains Mono, monospace", flexShrink: 0,
          }}>
            {icon}
          </span>
          <span>
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", display: "block" }}>{name}</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{role}</span>
          </span>
        </span>
        <span style={{
          color: c.text, fontSize: 14, marginLeft: 12, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform .2s",
        }}>▾</span>
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ background: "var(--bg-card)", borderTop: `1px solid ${c.border}22`, padding: "14px 16px" }}>

          {/* Navigate to topic button */}
          {topicMeta && onTopicSelect && (
            <button
              onClick={() => onTopicSelect({ id: topicId, ...topicMeta })}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "10px 14px", marginBottom: 14, borderRadius: 8,
                background: c.badge, border: `1px solid ${c.border}55`,
                color: c.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>→</span>
              Open "{topicMeta.name}" topic in AlgoMentor
            </button>
          )}

          {/* YouTube */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#f87171", marginBottom: 6 }}>
              📺 YouTube
            </div>
            {resources.youtube.map((v, i) => (
              <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 4,
                  borderRadius: 6, background: "rgba(239,68,68,.07)", color: "#fca5a5",
                  fontSize: 13, textDecoration: "none", border: "1px solid rgba(239,68,68,.15)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.07)"}
              >
                <span style={{ fontSize: 16 }}>▶</span>{v.title}
              </a>
            ))}
          </div>

          {/* Blogs */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#60a5fa", marginBottom: 6 }}>
              📖 Articles & Blogs
            </div>
            {resources.blogs.map((b, i) => (
              <a key={i} href={b.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 4,
                  borderRadius: 6, background: "rgba(59,130,246,.07)", color: "#93c5fd",
                  fontSize: 13, textDecoration: "none", border: "1px solid rgba(59,130,246,.15)",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(59,130,246,.07)"}
              >
                <span style={{ fontSize: 14 }}>↗</span>{b.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MistakeCard({ index, mistake }) {
  const [open, setOpen] = useState(false);

  // Handle both old string format and new object format gracefully
  if (typeof mistake === "string") {
    return (
      <div style={{ padding: "12px 16px", background: "var(--bg-card)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, fontSize: 14 }}>
        {mistake}
      </div>
    );
  }

  const { title, why, example, fix } = mistake;

  return (
    <div style={{ border: "1px solid rgba(239,68,68,.25)", borderRadius: 8, overflow: "hidden" }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "rgba(239,68,68,.06)", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,.2)",
            color: "#f87171", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {index + 1}
          </span>
          <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{str(title)}</span>
        </span>
        <span style={{ color: "#f87171", fontSize: 14, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }}>▾</span>
      </button>

      {/* Body */}
      {open && (
        <div style={{ background: "var(--bg-card)", borderTop: "1px solid rgba(239,68,68,.15)" }}>
          {/* Why */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#f87171", marginBottom: 6 }}>
              Why it happens
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>{str(why)}</p>
          </div>

          {/* Example */}
          {example && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#fbbf24", marginBottom: 6 }}>
                ❌ Wrong example
              </div>
              <pre style={{
                margin: 0, padding: "10px 14px",
                background: "var(--bg)", border: "1px solid rgba(245,158,11,.2)",
                borderRadius: 6, fontSize: 12, fontFamily: "JetBrains Mono, monospace",
                color: "#fcd34d", whiteSpace: "pre-wrap", lineHeight: 1.7,
              }}>
                {str(example)}
              </pre>
            </div>
          )}

          {/* Fix */}
          {fix && (
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "#4ade80", marginBottom: 6 }}>
                ✅ How to fix it
              </div>
              <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, margin: 0 }}>{str(fix)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PrerequisiteCard({ name }) {
  const [open, setOpen] = useState(false);
  const resources = getResources(name);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "var(--bg)", border: "none", cursor: "pointer",
          color: "var(--text)", fontSize: 14, fontWeight: 500,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ background: "rgba(59,130,246,.15)", color: "#60a5fa", borderRadius: 99, padding: "2px 10px", fontSize: 12 }}>
            prereq
          </span>
          {name}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 16, transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▾
        </span>
      </button>

      {open && (
        <div style={{ padding: "12px 14px 14px", background: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
          {/* YouTube links */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#f87171", marginBottom: 6 }}>
              📺 YouTube
            </div>
            {resources.youtube.map((v, i) => (
              <a
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  marginBottom: 4, borderRadius: 6, background: "rgba(239,68,68,.07)",
                  color: "#fca5a5", fontSize: 13, textDecoration: "none",
                  border: "1px solid rgba(239,68,68,.15)", transition: "background .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,.07)"}
              >
                <span style={{ fontSize: 16 }}>▶</span>
                {v.title}
              </a>
            ))}
          </div>

          {/* Blog links */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "#60a5fa", marginBottom: 6 }}>
              📖 Articles & Blogs
            </div>
            {resources.blogs.map((b, i) => (
              <a
                key={i}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                  marginBottom: 4, borderRadius: 6, background: "rgba(59,130,246,.07)",
                  color: "#93c5fd", fontSize: 13, textDecoration: "none",
                  border: "1px solid rgba(59,130,246,.15)", transition: "background .15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(59,130,246,.14)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(59,130,246,.07)"}
              >
                <span style={{ fontSize: 14 }}>↗</span>
                {b.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
