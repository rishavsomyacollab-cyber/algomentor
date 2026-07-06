"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { RecommendationItem, Topic } from "@/lib/types";

const DIFF: Record<string, { color: string; glow: string; label: string }> = {
  beginner:     { color: "#34d399", glow: "rgba(52,211,153,.18)",  label: "Beginner"     },
  intermediate: { color: "#fbbf24", glow: "rgba(251,191,36,.18)",  label: "Intermediate" },
  advanced:     { color: "#f87171", glow: "rgba(248,113,113,.18)", label: "Advanced"     },
};

const EMOJI: Record<string, string> = {
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

interface Props { onTopicSelect: (topic: Topic) => void; }

function toTopic(item: RecommendationItem): Topic {
  return {
    id: item.id, name: item.name,
    description: item.description,
    category: item.category,
    difficulty: item.difficulty as Topic["difficulty"],
  };
}

function PathNode({ item, rank, onTopicSelect }: {
  item: RecommendationItem;
  rank: number;
  onTopicSelect: (t: Topic) => void;
}) {
  const [hov, setHov] = useState(false);
  const d = DIFF[item.difficulty] ?? DIFF.intermediate;
  const isFirst = rank === 0;

  return (
    <div
      onClick={() => onTopicSelect(toTopic(item))}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "relative",
        flex: "1 1 0",
        minWidth: 140,
        maxWidth: 220,
        padding: isFirst ? "14px 16px" : "12px 14px",
        background: hov ? "#111827" : (isFirst ? "#0f1420" : "#0d1117"),
        border: `1px solid ${hov ? d.color + "66" : isFirst ? d.color + "33" : "#1e2535"}`,
        borderRadius: 12,
        cursor: "pointer",
        transition: "all .18s cubic-bezier(.4,0,.2,1)",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov
          ? `0 8px 24px rgba(0,0,0,.45), 0 0 0 1px ${d.color}22`
          : isFirst ? `0 0 0 1px ${d.color}11` : "none",
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 12, right: 12, height: 2,
        background: `linear-gradient(90deg, transparent, ${d.color}, transparent)`,
        borderRadius: 99,
        opacity: isFirst ? 0.9 : 0.4,
      }} />

      {/* Step number */}
      <div style={{
        position: "absolute", top: 8, right: 10,
        fontSize: 9, fontWeight: 700, letterSpacing: ".04em",
        color: isFirst ? d.color : "#334155",
      }}>
        {isFirst ? "START" : `#${rank + 1}`}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginTop: 6 }}>
        <span style={{ fontSize: isFirst ? 20 : 17, lineHeight: 1, flexShrink: 0 }}>
          {EMOJI[item.id] ?? "📌"}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontWeight: 700,
            fontSize: isFirst ? 12 : 11,
            color: isFirst ? "#e2e8f0" : "#cbd5e1",
            lineHeight: 1.3,
            marginBottom: 5,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>{item.name}</div>
          <span style={{
            display: "inline-block",
            fontSize: 9, padding: "1px 6px", borderRadius: 99, fontWeight: 700,
            background: d.glow, color: d.color,
            border: `1px solid ${d.color}33`,
          }}>{d.label}</span>
          {item.reason && (
            <div style={{
              marginTop: 5, fontSize: 10, color: "#475569", lineHeight: 1.4,
              display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const, overflow: "hidden",
            }}>{item.reason}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{
      flexShrink: 0,
      display: "flex", alignItems: "center",
      padding: "0 2px",
    }}>
      <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
        <line x1="0" y1="8" x2="18" y2="8" stroke="#1e2535" strokeWidth="1.5" />
        <path d="M14 4 L20 8 L14 12" stroke="#334155" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function RecommendationStrip({ onTopicSelect }: Props) {
  const [items, setItems]         = useState<RecommendationItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showAll, setShowAll]     = useState(false);

  useEffect(() => {
    api.getPersonalisedFeed(8)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div style={{ height: 13, width: 130, borderRadius: 4, background: "#1e2535", marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: "1 1 0", minWidth: 130, height: 80, borderRadius: 12, background: "#0d1117", border: "1px solid #1e2535" }} />
        ))}
      </div>
    </div>
  );

  if (items.length === 0) return null;

  const visible = showAll ? items : items.slice(0, 3);
  const hidden  = items.slice(3);

  return (
    <div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#475569" }}>
          Recommended Next
        </span>
        <div style={{ flex: 1, height: 1, background: "#1e2535" }} />
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
          background: "rgba(99,102,241,.1)", color: "#818cf8",
          border: "1px solid rgba(99,102,241,.2)",
        }}>personalised ✦</span>
      </div>

      {/* Path row */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", minWidth: 0 }}>
        {visible.map((item, i) => (
          <>
            <PathNode key={item.id} item={item} rank={i} onTopicSelect={onTopicSelect} />
            {i < visible.length - 1 && <Arrow key={`arrow-${i}`} />}
          </>
        ))}

        {/* Show more / less toggle */}
        {hidden.length > 0 && !showAll && (
          <>
            <Arrow key="arrow-more" />
            <button
              onClick={() => setShowAll(true)}
              style={{
                flexShrink: 0,
                background: "none",
                border: "1px dashed #1e2535",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#475569", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
                transition: "all .15s", letterSpacing: ".03em",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,.4)";
                (e.currentTarget as HTMLButtonElement).style.color = "#818cf8";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e2535";
                (e.currentTarget as HTMLButtonElement).style.color = "#475569";
              }}
            >
              +{hidden.length} more
            </button>
          </>
        )}

        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            style={{
              flexShrink: 0, marginLeft: 8,
              background: "none", border: "1px solid #1e2535",
              borderRadius: 8, padding: "6px 12px",
              color: "#475569", fontSize: 10, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#818cf8";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#475569";
            }}
          >
            ▲ less
          </button>
        )}
      </div>
    </div>
  );
}
