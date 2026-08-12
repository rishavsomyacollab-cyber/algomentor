"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TOPIC_ICONS, DIFF_COLORS } from "@/lib/topicMeta";
import type { RecommendationItem, Topic } from "@/lib/types";

interface Props { onTopicSelect: (topic: Topic) => void; }

function toTopic(item: RecommendationItem): Topic {
  return {
    id: item.id, name: item.name,
    description: item.description,
    category: item.category,
    difficulty: item.difficulty as Topic["difficulty"],
  };
}

function ThenNode({ item, onTopicSelect }: { item: RecommendationItem; onTopicSelect: (t: Topic) => void }) {
  const [hov, setHov] = useState(false);
  const d = DIFF_COLORS[item.difficulty] || DIFF_COLORS.beginner;
  return (
    <div
      onClick={() => onTopicSelect(toTopic(item))}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: "1 1 0", minWidth: 150, maxWidth: 220,
        padding: "12px 14px", borderRadius: 12, cursor: "pointer",
        background: hov ? "var(--bg-hover)" : "var(--bg-card)",
        border: `1px solid ${hov ? "rgba(99,102,241,.4)" : "var(--border)"}`,
        transition: "all .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{ fontSize: 15 }}>{TOPIC_ICONS[item.id] ?? "📌"}</span>
        <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </span>
      </div>
      <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 99, fontWeight: 700, background: d.bg, color: d.text, border: `1px solid ${d.border}` }}>
        {item.difficulty}
      </span>
    </div>
  );
}

export default function JourneyPanel({ onTopicSelect }: Props) {
  const [items, setItems]     = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPersonalisedFeed(6)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{
      marginBottom: 28, padding: "22px 24px", borderRadius: 16,
      background: "linear-gradient(135deg, rgba(99,102,241,.08), rgba(34,211,238,.04))",
      border: "1px solid rgba(99,102,241,.18)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 15 }}>🧭</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Your Journey
        </span>
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600,
          background: "rgba(99,102,241,.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,.25)",
        }}>personalised ✦</span>
      </div>

      {loading && (
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: "1 1 320px", height: 90, borderRadius: 14, background: "var(--bg-card)", border: "1px solid var(--border)" }} />
          <div style={{ flex: "1 1 0", height: 90, borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--border)" }} />
          <div style={{ flex: "1 1 0", height: 90, borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--border)" }} />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", color: "var(--text-muted)", fontSize: 13 }}>
          <span style={{ fontSize: 22 }}>🎉</span>
          You&apos;ve worked through everything we can recommend right now — browse the full list below to pick your next topic.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "flex", gap: 14, alignItems: "stretch", flexWrap: "wrap" }}>
          {/* Primary "Next Up" card */}
          {(() => {
            const next = items[0];
            const d = DIFF_COLORS[next.difficulty] || DIFF_COLORS.beginner;
            return (
              <div
                onClick={() => onTopicSelect(toTopic(next))}
                style={{
                  flex: "1 1 320px", padding: "18px 20px", borderRadius: 14, cursor: "pointer",
                  background: "var(--bg-card)", border: `1px solid ${d.border}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,.35)",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{TOPIC_ICONS[next.id] ?? "📌"}</span>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", color: d.text }}>NEXT UP</div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{next.name}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 12 }}>
                    {next.reason || "Recommended for you"}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "7px 16px", fontSize: 12 }}
                    onClick={e => { e.stopPropagation(); onTopicSelect(toTopic(next)); }}
                  >
                    Start →
                  </button>
                  <span style={{ fontSize: 10, padding: "3px 9px", borderRadius: 99, fontWeight: 600, background: d.bg, color: d.text, border: `1px solid ${d.border}` }}>
                    {next.difficulty}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* "Then:" chain */}
          {items.length > 1 && (
            <div style={{ flex: "2 1 380px", display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "var(--text-subtle)" }}>THEN</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {items.slice(1, 4).map(item => (
                  <ThenNode key={item.id} item={item} onTopicSelect={onTopicSelect} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
