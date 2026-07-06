"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import RecommendationStrip from "./RecommendationStrip";
import type { Topic, SearchResult } from "@/lib/types";

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  searching:           { label: "Searching",            icon: "🔍" },
  sorting:             { label: "Sorting",               icon: "↕️" },
  arrays:              { label: "Arrays & Strings",      icon: "▦" },
  graphs:              { label: "Graphs & Trees",        icon: "🌿" },
  dynamic_programming: { label: "Dynamic Programming",   icon: "⚡" },
  data_structures:     { label: "Data Structures",       icon: "🗂️" },
};

const FEATURED_IDS = [
  "binary_search", "two_pointers", "sliding_window", "prefix_sum",
  "linked_list", "stack_queue", "hash_map", "binary_tree",
  "bfs", "dfs", "fibonacci_dp", "merge_sort",
];

const TOPICS_PER_CAT = 4;

const TOPIC_ICONS: Record<string, string> = {
  binary_search:    "🔎",
  two_pointers:     "👇",
  sliding_window:   "🪟",
  linked_list:      "🔗",
  hash_map:         "🗃️",
  stack_queue:      "📚",
  binary_tree:      "🌳",
  bfs:              "🌊",
  dfs:              "🕳️",
  bubble_sort:      "🫧",
  merge_sort:       "🔀",
  quick_sort:       "⚡",
  fibonacci_dp:     "🌀",
  knapsack:         "🎒",
};

const DIFF_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  beginner:     { bg: "rgba(16,185,129,.1)",  text: "#34d399", border: "rgba(16,185,129,.2)" },
  intermediate: { bg: "rgba(245,158,11,.1)",  text: "#fbbf24", border: "rgba(245,158,11,.2)" },
  advanced:     { bg: "rgba(239,68,68,.1)",   text: "#f87171", border: "rgba(239,68,68,.2)"  },
};

function TopicCard({ t, hoveredId, setHoveredId, onSelect }: {
  t: Topic;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onSelect: (t: Topic) => void;
}) {
  const diff = DIFF_COLORS[t.difficulty] || DIFF_COLORS.beginner;
  const isHov = hoveredId === t.id;
  return (
    <div
      onClick={() => onSelect(t)}
      onMouseEnter={() => setHoveredId(t.id)}
      onMouseLeave={() => setHoveredId(null)}
      style={{
        position: "relative", padding: "16px 18px",
        background: isHov ? "var(--bg-hover)" : "var(--bg-card)",
        border: `1px solid ${isHov ? "rgba(99,102,241,.5)" : "var(--border)"}`,
        borderRadius: 12, cursor: "pointer",
        transition: "all .18s cubic-bezier(.4,0,.2,1)",
        transform: isHov ? "translateY(-2px)" : "none",
        boxShadow: isHov ? "0 10px 28px rgba(0,0,0,.45), 0 0 20px rgba(99,102,241,.08)" : "0 2px 10px rgba(0,0,0,.25)",
        overflow: "hidden",
      }}
    >
      {isHov && (
        <div style={{
          position: "absolute", top: 0, left: 0, width: 80, height: 80,
          background: "radial-gradient(circle at 0 0, rgba(99,102,241,.12), transparent 70%)",
          pointerEvents: "none",
        }} />
      )}
      {t.progress?.completed && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: 0, height: 0,
          borderStyle: "solid", borderWidth: "0 24px 24px 0",
          borderColor: "transparent rgba(16,185,129,.5) transparent transparent",
        }} />
      )}
      <div style={{ fontSize: 22, marginBottom: 8 }}>{TOPIC_ICONS[t.id] || "📌"}</div>
      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{t.name}</div>
      <div style={{
        fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5,
        display: "-webkit-box", WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const, overflow: "hidden",
      }}>
        {t.description}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
          background: diff.bg, color: diff.text, border: `1px solid ${diff.border}`,
        }}>{t.difficulty}</span>
        {t.progress?.completed && (
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
            background: "rgba(16,185,129,.12)", color: "#34d399", border: "1px solid rgba(16,185,129,.2)",
          }}>✓ done</span>
        )}
        {(t.progress?.quiz_best_score ?? 0) > 0 && !t.progress?.completed && (
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
            background: "rgba(99,102,241,.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.2)",
          }}>quiz {t.progress!.quiz_best_score}%</span>
        )}
      </div>
    </div>
  );
}

interface TopicMapProps {
  onSelect: (topic: Topic) => void;
}

export default function TopicMap({ onSelect }: TopicMapProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasDirectMatch, setHasDirectMatch] = useState(false);
  const [showPath, setShowPath] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.getTopics()
      .then(setTopics)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Fast SQL search — no Ollama, no debounce needed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setHasDirectMatch(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await api.searchQuick(q, 6);
        setHasDirectMatch(results.length > 0);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
        setHasDirectMatch(false);
      } finally {
        setSearching(false);
      }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  if (loading) return (
    <div className="loading"><div className="spinner" /> Loading topics…</div>
  );
  if (error) return (
    <div className="error-msg">Failed to load topics: {error}</div>
  );

  const grouped = topics.reduce<Record<string, Topic[]>>((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  const completed = topics.filter(t => t.progress?.completed).length;
  const pct = Math.round((completed / Math.max(topics.length, 1)) * 100);

  const isSearchActive = query.trim().length >= 2;

  async function handleCreateAndLearn() {
    const name = query.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const topic = await api.createTopic(name);
      // Add to local topics state so topicById stays in sync
      setTopics(prev => prev.some(t => t.id === topic.id) ? prev : [...prev, topic]);
      setQuery("");
      onSelect(topic);
    } catch {
      // silently fail
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>

      {/* ── Search bar ── */}
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#0d1117", border: "1px solid #1e2535",
          borderRadius: 12, padding: "10px 16px",
          boxShadow: query ? "0 0 0 2px rgba(99,102,241,.25)" : "none",
          transition: "box-shadow .2s",
        }}>
          <span style={{ fontSize: 16, color: "#334155", flexShrink: 0 }}>
            {searching ? "⏳" : "🔍"}
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search topics… e.g. 'find duplicates fast', 'shortest path', 'sort in place'"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 14, fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#475569", fontSize: 16, padding: 0, flexShrink: 0,
              }}
            >✕</button>
          )}
        </div>

        {/* Search results dropdown */}
        {isSearchActive && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
            background: "#0d1117", border: "1px solid #1e2535", borderRadius: 12,
            overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,.6)",
          }}>
            {/* Loading */}
            {searching && (
              <div style={{ padding: "16px 20px", color: "#475569", fontSize: 13 }}>
                <span style={{ display: "inline-block", animation: "pulse 1s infinite", marginRight: 8 }}>●</span>
                Searching…
              </div>
            )}

            {/* Existing topic results */}
            {!searching && searchResults.map((r) => {
              const diff = DIFF_COLORS[r.difficulty] || DIFF_COLORS.beginner;
              const topicToOpen: Topic = {
                id: r.id,
                name: r.name,
                description: r.description,
                category: r.category,
                difficulty: (["beginner","intermediate","advanced"].includes(r.difficulty)
                  ? r.difficulty : "intermediate") as Topic["difficulty"],
              };
              return (
                <div
                  key={r.id}
                  onClick={() => { onSelect(topicToOpen); setQuery(""); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 20px", cursor: "pointer",
                    borderBottom: "1px solid #1e2535",
                    transition: "background .12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{TOPIC_ICONS[r.id] || "📌"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#e2e8f0" }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: "#475569", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, flexShrink: 0,
                    background: diff.bg, color: diff.text, border: `1px solid ${diff.border}`,
                  }}>{r.difficulty}</span>
                </div>
              );
            })}

            {/* "Create & Learn" — shown when no exact match */}
            {!searching && !hasDirectMatch && (
              <div
                onClick={handleCreateAndLearn}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 20px", cursor: creating ? "default" : "pointer",
                  background: "rgba(99,102,241,.06)",
                  transition: "background .12s",
                }}
                onMouseEnter={e => { if (!creating) (e.currentTarget.style.background = "rgba(99,102,241,.12)"); }}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(99,102,241,.06)")}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{creating ? "⏳" : "✨"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#818cf8" }}>
                    {creating ? "Creating topic…" : `Learn "${query.trim()}" →`}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                    {creating ? "Generating content with AI…" : "Not in our curriculum yet — AI will generate explanation, code, quiz & complexity for you"}
                  </div>
                </div>
                {!creating && (
                  <span style={{
                    fontSize: 11, padding: "4px 12px", borderRadius: 99, fontWeight: 700,
                    background: "rgba(99,102,241,.2)", color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,.3)",
                  }}>Generate with AI</span>
                )}
              </div>
            )}

            {/* Empty state — only when no results AND has direct match check done */}
            {!searching && searchResults.length === 0 && hasDirectMatch === false && !query && (
              <div style={{ padding: "16px 20px", color: "#475569", fontSize: 13 }}>
                No topics found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Learning Path (collapsible) ── */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => setShowPath(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: showPath ? "rgba(99,102,241,.08)" : "#0d1117",
            border: `1px solid ${showPath ? "rgba(99,102,241,.3)" : "#1e2535"}`,
            borderRadius: 10, padding: "10px 16px",
            cursor: "pointer", width: "100%", textAlign: "left",
            transition: "all .15s",
          }}
        >
          <span style={{ fontSize: 15 }}>🗺️</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: showPath ? "#a5b4fc" : "#94a3b8" }}>
            Learning Path
          </span>
          <span style={{ fontSize: 11, color: "#475569", marginLeft: 4 }}>
            — see your personalised study sequence
          </span>
          <span style={{
            marginLeft: "auto", fontSize: 11, color: showPath ? "#818cf8" : "#334155",
            fontWeight: 700, transition: "transform .2s",
            display: "inline-block", transform: showPath ? "rotate(180deg)" : "none",
          }}>▼</span>
        </button>

        {showPath && (
          <div style={{
            marginTop: 10, padding: "20px 20px 12px",
            background: "#0a0e17", border: "1px solid #1e2535",
            borderRadius: 12, overflow: "hidden",
          }}>
            <RecommendationStrip onTopicSelect={t => { onSelect(t); setShowPath(false); }} />
          </div>
        )}
      </div>

      {/* ── Hero ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontSize: 28, fontWeight: 700, letterSpacing: "-.5px", marginBottom: 6,
              background: "linear-gradient(135deg, #e2e8f0 0%, #818cf8 55%, #22d3ee 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              DSA Topic Map
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {topics.length} topics · search to jump straight in, or browse below
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {[
              { value: topics.length, label: "Topics",    color: "var(--primary-light)" },
              { value: completed,      label: "Done",      color: "#34d399" },
              { value: `${pct}%`,      label: "Progress",  color: "#22d3ee" },
            ].map(s => (
              <div key={s.label} style={{
                padding: "8px 14px", textAlign: "center",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, minWidth: 60,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: "linear-gradient(90deg, var(--primary), #22d3ee)",
            borderRadius: 99, transition: "width .5s cubic-bezier(.4,0,.2,1)",
          }} />
        </div>
      </div>

      {/* ── Featured Topics ── */}
      {(() => {
        const featuredTopics = FEATURED_IDS
          .map(id => topics.find(t => t.id === id))
          .filter(Boolean) as Topic[];
        if (featuredTopics.length === 0) return null;
        return (
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 15 }}>⭐</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Start Here
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
              <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                {featuredTopics.filter(t => t.progress?.completed).length}/{featuredTopics.length} done
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {featuredTopics.map(t => <TopicCard key={t.id} t={t} hoveredId={hoveredId} setHoveredId={setHoveredId} onSelect={onSelect} />)}
            </div>
          </div>
        );
      })()}

      {/* ── Category Sections (collapsed, show 4 each) ── */}
      {Object.entries(grouped).map(([cat, items]) => {
        const meta = CATEGORY_LABELS[cat] || { label: cat, icon: "📦" };
        const isExpanded = expandedCats[cat] ?? false;
        const visible = isExpanded ? items : items.slice(0, TOPICS_PER_CAT);
        const hidden = items.length - TOPICS_PER_CAT;
        return (
          <div key={cat} style={{ marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 15 }}>{meta.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {meta.label}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
              <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
                {items.filter(i => i.progress?.completed).length}/{items.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {visible.map(t => <TopicCard key={t.id} t={t} hoveredId={hoveredId} setHoveredId={setHoveredId} onSelect={onSelect} />)}
            </div>
            {hidden > 0 && (
              <button
                onClick={() => setExpandedCats(prev => ({ ...prev, [cat]: !isExpanded }))}
                style={{
                  marginTop: 10, background: "none", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "6px 16px", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: 12, fontFamily: "inherit",
                  transition: "all .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,.5)"; (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              >
                {isExpanded ? "Show less ↑" : `Show ${hidden} more →`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
