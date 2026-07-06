"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import type { UserStats, ActivityEvent, Topic } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  arrays: "Arrays & Strings", sorting: "Sorting", searching: "Searching",
  data_structures: "Data Structures", graphs: "Graphs",
  dynamic_programming: "Dynamic Programming", greedy: "Greedy",
  backtracking: "Backtracking", advanced: "Advanced",
};

const EVENT_ICON: Record<string, string> = {
  view: "👁️", quiz_start: "📝", quiz_complete: "✅",
  search: "🔍", bookmark: "🔖",
};

const EVENT_LABEL: Record<string, string> = {
  view: "Viewed", quiz_start: "Started quiz on", quiz_complete: "Completed quiz for",
  search: "Searched", bookmark: "Bookmarked",
};

function formatTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Activity Heatmap ─────────────────────────────────────────────────────────

function Heatmap({ data }: { data: Record<string, number> }) {
  const WEEKS = 52;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 52 × 7 grid starting from the Sunday 52 weeks ago
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - (WEEKS * 7) + 1);
  // Align to Sunday
  startDay.setDate(startDay.getDate() - startDay.getDay());

  const cells: { date: string; count: number }[] = [];
  const cursor = new Date(startDay);
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    cells.push({ date: key, count: data[key] ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const maxVal = Math.max(...cells.map(c => c.count), 1);

  function cellColor(count: number): string {
    if (count === 0) return "#0d1117";
    const t = count / maxVal;
    if (t < 0.25) return "rgba(99,102,241,.25)";
    if (t < 0.5)  return "rgba(99,102,241,.5)";
    if (t < 0.75) return "rgba(99,102,241,.75)";
    return "#6366f1";
  }

  // Month labels: find first cell of each month
  const monthLabels: { col: number; label: string }[] = [];
  cells.forEach((c, i) => {
    if (new Date(c.date).getDate() === 1 || i === 0) {
      const col = Math.floor(i / 7);
      const label = new Date(c.date).toLocaleDateString("en-US", { month: "short" });
      if (monthLabels.length === 0 || monthLabels[monthLabels.length - 1].label !== label) {
        monthLabels.push({ col, label });
      }
    }
  });

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totalCols = Math.ceil(cells.length / 7);

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 3, paddingBottom: 4, paddingLeft: 28, minWidth: totalCols * 14 + 28 }}>
        {Array.from({ length: totalCols }).map((_, col) => (
          <div key={col} style={{ fontSize: 9, color: "#334155", width: 11, textAlign: "center" }}>
            {monthLabels.find(m => m.col === col)?.label ?? ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {/* Day labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 4 }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{ height: 11, fontSize: 8, color: i % 2 === 1 ? "#334155" : "transparent", lineHeight: "11px" }}>
              {d}
            </div>
          ))}
        </div>
        {/* Grid columns */}
        {Array.from({ length: totalCols }).map((_, col) => (
          <div key={col} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {Array.from({ length: 7 }).map((_, row) => {
              const idx = col * 7 + row;
              const cell = cells[idx];
              if (!cell) return <div key={row} style={{ width: 11, height: 11 }} />;
              return (
                <div
                  key={row}
                  title={`${cell.date}: ${cell.count} events`}
                  style={{
                    width: 11, height: 11, borderRadius: 2,
                    background: cellColor(cell.count),
                    border: "1px solid rgba(255,255,255,.04)",
                    cursor: cell.count > 0 ? "default" : "default",
                    transition: "transform .1s",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, paddingLeft: 28 }}>
        <span style={{ fontSize: 9, color: "#334155", marginRight: 4 }}>Less</span>
        {["#0d1117", "rgba(99,102,241,.25)", "rgba(99,102,241,.5)", "rgba(99,102,241,.75)", "#6366f1"].map((c, i) => (
          <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c, border: "1px solid rgba(255,255,255,.06)" }} />
        ))}
        <span style={{ fontSize: 9, color: "#334155", marginLeft: 4 }}>More</span>
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <div style={{
      padding: "20px 24px", background: "#0d1117",
      border: "1px solid #1e2535", borderRadius: 14,
      flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent ?? "#e2e8f0", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

// ── Category progress bar ─────────────────────────────────────────────────────

function CategoryBar({ cat }: { cat: { category: string; total: number; completed: number; avg_score: number } }) {
  const pct = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
          {CATEGORY_LABEL[cat.category] ?? cat.category.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 12, color: "#475569" }}>
          {cat.completed}/{cat.total}
          {cat.avg_score > 0 && (
            <span style={{ marginLeft: 8, color: "#818cf8" }}>{cat.avg_score}% avg</span>
          )}
        </span>
      </div>
      <div style={{ height: 6, background: "#1e2535", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: pct === 100 ? "#10b981"
            : pct > 50 ? "linear-gradient(90deg,#6366f1,#22d3ee)"
            : "rgba(99,102,241,.6)",
          borderRadius: 99, transition: "width .6s ease",
        }} />
      </div>
    </div>
  );
}

// ── Bookmark card ─────────────────────────────────────────────────────────────

const DIFF_COLOR: Record<string, string> = {
  beginner: "#10b981", intermediate: "#f59e0b", advanced: "#ef4444",
};

function BookmarkCard({ topic, onSelect }: { topic: Topic; onSelect: (t: Topic) => void }) {
  return (
    <div
      onClick={() => onSelect(topic)}
      style={{
        padding: "14px 16px", background: "#0d1117",
        border: "1px solid #1e2535", borderRadius: 12,
        cursor: "pointer", transition: "all .18s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,.4)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#1e2535";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.3 }}>
        {topic.name}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#475569" }}>{topic.category?.replace(/_/g, " ")}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 99,
          color: DIFF_COLOR[topic.difficulty] ?? "#94a3b8",
          background: DIFF_COLOR[topic.difficulty] ? `${DIFF_COLOR[topic.difficulty]}18` : "transparent",
        }}>
          {topic.difficulty}
        </span>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, hydrate, logout } = useAuthStore();

  const [stats, setStats]         = useState<UserStats | null>(null);
  const [activity, setActivity]   = useState<ActivityEvent[]>([]);
  const [bookmarks, setBookmarks] = useState<Topic[]>([]);
  const [loading, setLoading]     = useState(true);

  // Session restore on first load
  useEffect(() => { hydrate(); }, [hydrate]);

  // Redirect if not authenticated once we know auth state
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, b] = await Promise.all([
        api.getUserStats(),
        api.getUserActivity(30),
        api.getBookmarks(),
      ]);
      setStats(s);
      setActivity(a);
      setBookmarks(b);
    } catch {
      // auth errors handled by api.ts auto-refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, loadData]);

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070911" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070911", color: "#e2e8f0" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 32px", height: 60,
        background: "rgba(7,9,15,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,.05)",
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#6366f1,#22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#fff",
          }}>A</div>
          <span style={{
            fontSize: 16, fontWeight: 700,
            background: "linear-gradient(135deg,#e2e8f0 0%,#818cf8 60%,#22d3ee 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>AlgoMentor</span>
        </Link>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,.08)" }} />
        <span style={{ fontSize: 13, color: "#475569" }}>Dashboard</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "var(--primary)", display: "flex",
            alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: "#fff",
          }}>
            {user?.username?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{user?.username}</span>
          <button
            onClick={() => { logout(); router.push("/"); }}
            style={{ fontSize: 12, color: "#475569", background: "none", border: "none", cursor: "pointer" }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 32px" }}>

        {/* Welcome */}
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4 }}>
            Welcome back, {user?.username} 👋
          </h1>
          <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
            {user?.email} · Member since {user ? new Date((user as typeof user & { created_at?: string }).created_at ?? Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
          </p>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div className="spinner" />
          </div>
        ) : stats ? (
          <>
            {/* ── Stat cards ── */}
            <div style={{ display: "flex", gap: 14, marginBottom: 32, flexWrap: "wrap" }}>
              <StatCard label="Topics Completed"  value={stats.total_completed}           accent="#10b981" />
              <StatCard label="Avg Quiz Score"     value={`${stats.avg_quiz_score}%`}       accent="#6366f1" />
              <StatCard label="Learning Streak"    value={`${stats.streak_days}d`}          accent="#f59e0b"
                sub={stats.streak_days > 0 ? "Keep it up! 🔥" : "Start a streak today"} />
              <StatCard label="Time Spent"         value={formatTime(stats.total_time_sec)} accent="#22d3ee"
                sub="across all topics" />
            </div>

            {/* ── Heatmap ── */}
            <section style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, padding: "22px 24px", marginBottom: 28 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 18px", color: "#94a3b8", letterSpacing: ".04em" }}>
                Activity — last 52 weeks
              </h2>
              <Heatmap data={stats.heatmap} />
            </section>

            {/* ── Two-column: categories + activity ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>

              {/* Category progress */}
              <section style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, padding: "22px 24px" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 20px", color: "#94a3b8" }}>
                  Category Progress
                </h2>
                {stats.categories.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#334155" }}>Start learning to see progress here.</p>
                ) : (
                  stats.categories.map(c => <CategoryBar key={c.category} cat={c} />)
                )}
              </section>

              {/* Recent activity */}
              <section style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, padding: "22px 24px", overflowY: "auto", maxHeight: 420 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", color: "#94a3b8" }}>
                  Recent Activity
                </h2>
                {activity.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#334155" }}>No activity yet — start exploring topics!</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activity.map(ev => (
                      <div key={ev.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: 16, lineHeight: "20px" }}>{EVENT_ICON[ev.event_type] ?? "📌"}</span>
                        <div>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                              {EVENT_LABEL[ev.event_type] ?? ev.event_type}
                            </span>
                            {ev.topic_name && (
                              <> <span style={{ color: "#818cf8" }}>{ev.topic_name}</span></>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "#334155", marginTop: 1 }}>{formatDate(ev.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* ── Bookmarks ── */}
            <section style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#94a3b8" }}>
                  Bookmarks ({bookmarks.length})
                </h2>
                <Link href="/" style={{ fontSize: 12, color: "#6366f1", textDecoration: "none" }}>
                  Browse topics →
                </Link>
              </div>
              {bookmarks.length === 0 ? (
                <p style={{ fontSize: 13, color: "#334155" }}>
                  No bookmarks yet — click the bookmark icon on any topic to save it here.
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                  {bookmarks.map(t => (
                    <BookmarkCard
                      key={t.id}
                      topic={t}
                      onSelect={topic => {
                        // Store selection and navigate to home
                        sessionStorage.setItem("openTopic", JSON.stringify(topic));
                        router.push("/");
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <div style={{ textAlign: "center", color: "#475569", marginTop: 80 }}>
            <p>Failed to load dashboard data. Please refresh.</p>
          </div>
        )}
      </main>
    </div>
  );
}
