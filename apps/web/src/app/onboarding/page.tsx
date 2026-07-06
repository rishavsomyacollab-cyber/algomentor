"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

// ── Step data ──────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "experience",
    title: "What's your DSA experience?",
    subtitle: "We'll personalise your learning path based on where you're starting.",
    field: "experience_level",
    multi: false,
    options: [
      { value: "beginner",     icon: "🌱", label: "Complete Beginner",    desc: "Never written an algorithm — starting from zero" },
      { value: "learning",     icon: "📖", label: "Learning the Basics",  desc: "Know some arrays and sorting, still building fundamentals" },
      { value: "intermediate", icon: "⚡", label: "Intermediate",         desc: "Solved 50+ problems, comfortable with trees & graphs" },
      { value: "advanced",     icon: "🏆", label: "Advanced",             desc: "Competitive programmer or senior engineer" },
    ],
  },
  {
    id: "goal",
    title: "What's your primary goal?",
    subtitle: "This shapes which topics and difficulty levels we recommend first.",
    field: "goal",
    multi: false,
    options: [
      { value: "interviews",    icon: "💼", label: "Crack Tech Interviews",     desc: "FAANG, startups, and SWE roles — interview patterns and problems" },
      { value: "competitive",   icon: "🥇", label: "Competitive Programming",  desc: "Codeforces, LeetCode contests, ICPC-style problems" },
      { value: "academic",      icon: "🎓", label: "Academic / Course Work",    desc: "CS degree coursework, exams, or structured curriculum" },
      { value: "self_improve",  icon: "🧠", label: "Build Problem-Solving Skills", desc: "General intellectual growth and algorithmic thinking" },
    ],
  },
  {
    id: "topics",
    title: "Which topics excite you?",
    subtitle: "Pick all that apply — we'll weight recommendations towards these areas.",
    field: "interested_categories",
    multi: true,
    options: [
      { value: "arrays",              icon: "📊", label: "Arrays & Strings",        desc: "Two pointers, sliding window, prefix sums" },
      { value: "data_structures",     icon: "🔗", label: "Linked Lists & Trees",    desc: "Pointers, BST, heaps, tries" },
      { value: "graphs",              icon: "🕸️", label: "Graphs",                 desc: "BFS, DFS, shortest paths, MST" },
      { value: "dynamic_programming", icon: "🧩", label: "Dynamic Programming",     desc: "Memoization, tabulation, classic DP problems" },
      { value: "sorting",             icon: "🔀", label: "Sorting & Searching",     desc: "Merge sort, quick sort, binary search" },
      { value: "greedy",              icon: "💡", label: "Greedy Algorithms",       desc: "Activity selection, Huffman, interval problems" },
      { value: "backtracking",        icon: "🔄", label: "Recursion & Backtracking",desc: "N-Queens, subsets, permutations" },
      { value: "advanced",            icon: "🚀", label: "Advanced Topics",         desc: "Segment trees, heavy-light, convex hull" },
    ],
  },
  {
    id: "time",
    title: "How much time can you commit?",
    subtitle: "We'll pace your recommendations and learning path accordingly.",
    field: "weekly_hours",
    multi: false,
    options: [
      { value: "casual",    icon: "☕", label: "Casual",     desc: "1–2 hours per week — learning at a relaxed pace" },
      { value: "regular",   icon: "📅", label: "Regular",    desc: "3–5 hours per week — steady, consistent progress" },
      { value: "dedicated", icon: "🔥", label: "Dedicated",  desc: "6–10 hours per week — serious about improvement" },
      { value: "intensive", icon: "⚡", label: "Intensive",  desc: "10+ hours per week — interview prep or contest mode" },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, hydrate } = useAuthStore();

  const SS_KEY = "onboarding_state";

  const [step, setStep]       = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "{}").step ?? 0; } catch { return 0; }
  });
  const [saving, setSaving]   = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "{}").answers ?? {
        experience_level: "", goal: "", interested_categories: [] as string[], weekly_hours: "",
      };
    } catch {
      return { experience_level: "", goal: "", interested_categories: [] as string[], weekly_hours: "" };
    }
  });

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // Persist step + answers so a refresh lands back on the same step
  useEffect(() => {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify({ step, answers })); } catch {}
  }, [step, answers]);

  if (isLoading || !isAuthenticated) return null;

  const current = STEPS[step];
  const progress = ((step) / STEPS.length) * 100;

  function toggleOption(field: string, value: string, multi: boolean) {
    if (multi) {
      setAnswers(prev => {
        const arr = (prev[field] as string[]) ?? [];
        return {
          ...prev,
          [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
        };
      });
    } else {
      setAnswers(prev => ({ ...prev, [field]: value }));
    }
  }

  function isSelected(field: string, value: string): boolean {
    const v = answers[field];
    if (Array.isArray(v)) return v.includes(value);
    return v === value;
  }

  function canAdvance(): boolean {
    const v = answers[current.field];
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await api.savePreferences({
        experience_level:      answers.experience_level as string,
        goal:                  answers.goal as string,
        interested_categories: answers.interested_categories as string[],
        weekly_hours:          answers.weekly_hours as string,
      });
    } catch { /* proceed anyway */ }
    try { sessionStorage.removeItem(SS_KEY); } catch {}
    router.push("/");
  }

  function handleNext() {
    if (step < STEPS.length - 1) setStep((s: number) => s + 1);
    else handleFinish();
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #6366f1, #22d3ee)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: "#fff",
        }}>A</div>
        <span style={{
          fontSize: 18, fontWeight: 700,
          background: "linear-gradient(135deg, #e2e8f0 0%, #818cf8 60%, #22d3ee 100%)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>AlgoMentor</span>
      </div>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 680,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        padding: "40px 44px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
      }}>

        {/* Progress bar */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              Step {step + 1} of {STEPS.length}
            </span>
            <span style={{ fontSize: 12, color: "var(--primary-light)", fontWeight: 600 }}>
              {Math.round(progress)}% complete
            </span>
          </div>
          <div style={{
            height: 4, borderRadius: 99,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: 99,
              background: "linear-gradient(90deg, #6366f1, #22d3ee)",
              width: `${progress}%`,
              transition: "width .4s cubic-bezier(.4,0,.2,1)",
            }} />
          </div>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{
                height: 4, flex: 1, borderRadius: 99,
                background: i <= step ? "var(--primary)" : "rgba(255,255,255,0.06)",
                transition: "background .3s",
              }} />
            ))}
          </div>
        </div>

        {/* Question */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8, lineHeight: 1.3 }}>
          {current.title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 28, lineHeight: 1.6 }}>
          {current.subtitle}
        </p>

        {/* Options */}
        <div style={{
          display: "grid",
          gridTemplateColumns: current.multi ? "repeat(2, 1fr)" : "repeat(2, 1fr)",
          gap: 12,
          marginBottom: 32,
        }}>
          {current.options.map(opt => {
            const selected = isSelected(current.field, opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggleOption(current.field, opt.value, current.multi)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  padding: "16px 18px",
                  background: selected ? "rgba(99,102,241,0.12)" : "var(--bg-card2)",
                  border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all .15s",
                  outline: "none",
                  boxShadow: selected ? "0 0 0 1px var(--primary)" : "none",
                }}
                onMouseEnter={e => {
                  if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.5)";
                }}
                onMouseLeave={e => {
                  if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>
                <div>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: selected ? "#fff" : "var(--text)",
                    marginBottom: 3,
                  }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {opt.desc}
                  </div>
                </div>
                {selected && !current.multi && (
                  <div style={{
                    marginLeft: "auto", flexShrink: 0,
                    width: 18, height: 18, borderRadius: "50%",
                    background: "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#fff", fontWeight: 700,
                  }}>✓</div>
                )}
                {selected && current.multi && (
                  <div style={{
                    marginLeft: "auto", flexShrink: 0,
                    width: 18, height: 18, borderRadius: 5,
                    background: "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, color: "#fff", fontWeight: 700,
                  }}>✓</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Multi-select hint */}
        {current.multi && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, marginTop: -16 }}>
            {(answers[current.field] as string[]).length} selected — pick as many as you like
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
          {step > 0 && (
            <button
              onClick={() => setStep((s: number) => s - 1)}
              style={{
                padding: "10px 20px", fontSize: 14, fontWeight: 500,
                color: "var(--text-muted)", background: "var(--bg-card2)",
                border: "1px solid var(--border)", borderRadius: 10,
                cursor: "pointer", transition: "all .15s",
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance() || saving}
            style={{
              padding: "10px 28px", fontSize: 14, fontWeight: 600,
              color: "#fff",
              background: canAdvance() ? "linear-gradient(135deg, #6366f1, #22d3ee)" : "rgba(255,255,255,0.06)",
              border: "none", borderRadius: 10,
              cursor: canAdvance() ? "pointer" : "not-allowed",
              transition: "all .15s",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : isLastStep ? "Start Learning" : "Continue →"}
          </button>
        </div>
      </div>

      {/* Skip */}
      <button
        onClick={() => { try { sessionStorage.removeItem(SS_KEY); } catch {} router.push("/"); }}
        style={{
          marginTop: 20, fontSize: 13, color: "var(--text-muted)",
          background: "none", border: "none", cursor: "pointer",
          textDecoration: "underline", opacity: 0.6,
        }}
      >
        Skip for now
      </button>
    </div>
  );
}
