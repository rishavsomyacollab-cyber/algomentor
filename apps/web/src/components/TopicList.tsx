"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Topic } from "@/lib/types";
import { CATEGORY_LABELS, TOPIC_ICONS, DIFF_COLORS } from "@/lib/topicMeta";

type Status = "all" | "not_started" | "in_progress" | "completed";
type Difficulty = "all" | "beginner" | "intermediate" | "advanced";
type SortBy = "alpha" | "difficulty" | "category";

function topicStatus(t: Topic): Exclude<Status, "all"> {
  if (t.progress?.completed) return "completed";
  if ((t.progress?.quiz_best_score ?? 0) > 0 || t.progress?.last_visited) return "in_progress";
  return "not_started";
}

const STATUS_META: Record<Exclude<Status, "all">, { label: string; icon: string; color: string }> = {
  not_started: { label: "Not started", icon: "○", color: "var(--text-muted)" },
  in_progress: { label: "In progress", icon: "◐", color: "#fbbf24" },
  completed:   { label: "Completed",   icon: "●", color: "#34d399" },
};

const DIFF_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 13px", borderRadius: 99, fontSize: 12, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
        background: active ? "rgba(99,102,241,.18)" : "var(--bg-card)",
        color: active ? "#a5b4fc" : "var(--text-muted)",
        border: `1px solid ${active ? "rgba(99,102,241,.4)" : "var(--border)"}`,
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );
}

function MultiSelectDropdown({
  label, options, selected, onToggle, onClear, isOpen, onOpenChange, note,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  note?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onOpenChange]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => onOpenChange(!isOpen)}
        style={{
          padding: "6px 13px", borderRadius: 99, fontSize: 12, fontWeight: 600,
          cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
          background: selected.size > 0 ? "rgba(99,102,241,.18)" : "var(--bg-card)",
          color: selected.size > 0 ? "#a5b4fc" : "var(--text-muted)",
          border: `1px solid ${selected.size > 0 ? "rgba(99,102,241,.4)" : "var(--border)"}`,
        }}
      >
        {label}{selected.size > 0 ? ` (${selected.size})` : ""}
        <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30,
          width: 240, maxHeight: 320, overflowY: "auto",
          background: "#0d1117", border: "1px solid #1e2535", borderRadius: 12,
          boxShadow: "0 16px 40px rgba(0,0,0,.55)", padding: 10,
        }}>
          {note && (
            <div style={{ fontSize: 10, color: "#f59e0b", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, padding: "6px 9px", marginBottom: 8, lineHeight: 1.4 }}>
              ⓘ {note}
            </div>
          )}
          {options.length > 8 && (
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              style={{
                width: "100%", marginBottom: 8, padding: "6px 10px", borderRadius: 8,
                background: "var(--bg-card2)", border: "1px solid var(--border)",
                color: "var(--text)", fontSize: 12, outline: "none",
              }}
            />
          )}
          {selected.size > 0 && (
            <button
              onClick={onClear}
              style={{ background: "none", border: "none", color: "#818cf8", fontSize: 11, cursor: "pointer", marginBottom: 6, padding: 0, fontFamily: "inherit" }}
            >
              Clear selection
            </button>
          )}
          {filtered.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-subtle)", padding: "6px 4px" }}>No matches</div>
          )}
          {filtered.map(opt => (
            <label
              key={opt}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", cursor: "pointer", fontSize: 12.5, color: "var(--text)" }}
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => onToggle(opt)}
                style={{ accentColor: "#6366f1" }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicListProps {
  topics: Topic[];
  onSelect: (t: Topic) => void;
}

export default function TopicList({ topics, onSelect }: TopicListProps) {
  const [status, setStatus]         = useState<Status>("all");
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [tags, setTags]             = useState<Set<string>>(new Set());
  const [companies, setCompanies]   = useState<Set<string>>(new Set());
  const [sortBy, setSortBy]         = useState<SortBy>("alpha");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const allCategories = useMemo(() => Array.from(new Set(topics.map(t => t.category))).sort(), [topics]);
  const allTags = useMemo(() => Array.from(new Set(topics.flatMap(t => t.tags ?? []))).sort(), [topics]);
  const allCompanies = useMemo(() => Array.from(new Set(topics.flatMap(t => t.companies ?? []))).sort(), [topics]);

  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  };

  const filtered = useMemo(() => {
    let result = topics.filter(t => {
      if (status !== "all" && topicStatus(t) !== status) return false;
      if (difficulty !== "all" && t.difficulty !== difficulty) return false;
      if (categories.size > 0 && !categories.has(t.category)) return false;
      if (tags.size > 0 && !(t.tags ?? []).some(tag => tags.has(tag))) return false;
      if (companies.size > 0 && !(t.companies ?? []).some(c => companies.has(c))) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "difficulty") return (DIFF_ORDER[a.difficulty] ?? 1) - (DIFF_ORDER[b.difficulty] ?? 1) || a.name.localeCompare(b.name);
      if (sortBy === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [topics, status, difficulty, categories, tags, companies, sortBy]);

  const activeFilterCount = (status !== "all" ? 1 : 0) + (difficulty !== "all" ? 1 : 0) + categories.size + tags.size + companies.size;

  const clearAll = () => {
    setStatus("all"); setDifficulty("all");
    setCategories(new Set()); setTags(new Set()); setCompanies(new Set());
  };

  return (
    <div>
      {/* ── Section header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 15 }}>📋</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          All Topics
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 4 }} />
        <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>
          {filtered.length} of {topics.length}
        </span>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 }}>
        {(["all", "not_started", "in_progress", "completed"] as Status[]).map(s => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {s === "all" ? "All status" : STATUS_META[s].label}
          </Chip>
        ))}
        <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} />
        {(["all", "beginner", "intermediate", "advanced"] as Difficulty[]).map(d => (
          <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
            {d === "all" ? "All levels" : d[0].toUpperCase() + d.slice(1)}
          </Chip>
        ))}
        <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 2px" }} />
        <MultiSelectDropdown
          label="Category" options={allCategories} selected={categories}
          onToggle={v => toggleSet(categories, setCategories, v)}
          onClear={() => setCategories(new Set())}
          isOpen={openDropdown === "category"} onOpenChange={o => setOpenDropdown(o ? "category" : null)}
        />
        <MultiSelectDropdown
          label="Tags" options={allTags} selected={tags}
          onToggle={v => toggleSet(tags, setTags, v)}
          onClear={() => setTags(new Set())}
          isOpen={openDropdown === "tags"} onOpenChange={o => setOpenDropdown(o ? "tags" : null)}
        />
        <MultiSelectDropdown
          label="Company" options={allCompanies} selected={companies}
          onToggle={v => toggleSet(companies, setCompanies, v)}
          onClear={() => setCompanies(new Set())}
          isOpen={openDropdown === "company"} onOpenChange={o => setOpenDropdown(o ? "company" : null)}
          note="AI-suggested based on general topic patterns — not sourced from verified interview reports."
        />

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            >
              Clear all ({activeFilterCount})
            </button>
          )}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            style={{
              padding: "6px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: "var(--bg-card)", color: "var(--text-muted)",
              border: "1px solid var(--border)", cursor: "pointer", outline: "none",
            }}
          >
            <option value="alpha">Sort: A–Z</option>
            <option value="difficulty">Sort: Difficulty</option>
            <option value="category">Sort: Category</option>
          </select>
        </div>
      </div>

      {/* ── Rows ── */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
        {filtered.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No topics match these filters.
          </div>
        )}
        {filtered.map((t, i) => {
          const diff = DIFF_COLORS[t.difficulty] || DIFF_COLORS.beginner;
          const st = STATUS_META[topicStatus(t)];
          const catMeta = CATEGORY_LABELS[t.category] || { label: t.category, icon: "📦" };
          const visibleTags = (t.tags ?? []).slice(0, 2);
          const extraTags = (t.tags ?? []).length - visibleTags.length;
          return (
            <div
              key={t.id}
              onClick={() => onSelect(t)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "13px 18px", cursor: "pointer",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                background: "var(--bg-card)",
                transition: "background .12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-card)")}
            >
              <span title={st.label} style={{ fontSize: 13, color: st.color, flexShrink: 0, width: 14, textAlign: "center" }}>{st.icon}</span>
              <span style={{ fontSize: 17, flexShrink: 0 }}>{TOPIC_ICONS[t.id] || "📌"}</span>

              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--text)" }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                </div>
              </div>

              <span style={{ fontSize: 11, color: "var(--text-subtle)", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, minWidth: 130 }}>
                {catMeta.icon} {catMeta.label}
              </span>

              <div style={{ display: "flex", gap: 4, flexShrink: 0, minWidth: 140 }}>
                {visibleTags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "rgba(148,163,184,.08)", color: "#94a3b8", border: "1px solid rgba(148,163,184,.15)" }}>
                    {tag}
                  </span>
                ))}
                {extraTags > 0 && (
                  <span style={{ fontSize: 10, padding: "2px 7px", color: "var(--text-subtle)" }}>+{extraTags}</span>
                )}
              </div>

              {(t.progress?.quiz_best_score ?? 0) > 0 && (
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontWeight: 600, flexShrink: 0, background: "rgba(99,102,241,.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,.2)" }}>
                  quiz {t.progress!.quiz_best_score}%
                </span>
              )}

              <span style={{
                fontSize: 10, padding: "2px 9px", borderRadius: 99, fontWeight: 600, flexShrink: 0,
                background: diff.bg, color: diff.text, border: `1px solid ${diff.border}`,
              }}>{t.difficulty}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
