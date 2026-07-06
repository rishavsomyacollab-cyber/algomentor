"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { Topic, QuizQuestion, EvaluationResult } from "@/lib/types";

interface Props { topic: Topic; }

const OPTION_LABELS = ["A", "B", "C", "D"];

const DIFF_META = {
  easy:   { color: "#34d399", bg: "rgba(16,185,129,.12)", border: "rgba(16,185,129,.25)", label: "Easy"   },
  medium: { color: "#fbbf24", bg: "rgba(245,158,11,.12)",  border: "rgba(245,158,11,.25)",  label: "Medium" },
  hard:   { color: "#f87171", bg: "rgba(239,68,68,.12)",   border: "rgba(239,68,68,.25)",   label: "Hard"   },
};

function ScoreRing({ pct }: { pct: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  const grade = pct >= 80 ? { label: "Excellent", color: "#34d399" }
              : pct >= 60 ? { label: "Good",      color: "#fbbf24" }
              :              { label: "Keep going", color: "#f87171" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={70} cy={70} r={r} fill="none" stroke="#1e2535" strokeWidth={10} />
          <circle cx={70} cy={70} r={r} fill="none" stroke={grade.color} strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: grade.color, lineHeight: 1 }}>{pct}%</span>
          <span style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>score</span>
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: grade.color }}>{grade.label}</div>
    </div>
  );
}

export default function QuizPanel({ topic }: Props) {
  const [difficulty, setDifficulty] = useState<"easy"|"medium"|"hard">("medium");
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [current, setCurrent]     = useState(0);
  const [selected, setSelected]   = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [hint, setHint]           = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState(1);
  const [scores, setScores]       = useState<number[]>([]);
  const [done, setDone]           = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [preparing, setPreparing]     = useState(false);

  async function loadQuiz() {
    setLoading(true); setError(null); setQuestions(null);
    setCurrent(0); setSelected(null); setEvaluation(null);
    setHint(null); setHintLevel(1); setScores([]); setDone(false);
    setPreparing(false);
    try {
      const result = await api.generateQuiz(topic.id, topic.name, difficulty, 5);
      if ((result as {preparing?: boolean}).preparing) {
        setPreparing(true);
        return;
      }
      setPreparing(false);
      setQuestions((result as {questions: import("@/lib/types").QuizQuestion[]}).questions || []);
    } catch (e) { setError((e as Error).message); }
    finally     { setLoading(false); }
  }

  async function selectOption(idx: number) {
    if (selected !== null || !questions) return;
    setSelected(idx);
    const q = questions[current];
    const correct = idx === q.correct_index;
    const score   = correct ? 100 : 0;
    const ev = {
      correct,
      score,
      feedback:    correct ? "Great job!" : `The correct answer was: ${q.options[q.correct_index]}`,
      explanation: q.explanation ?? "",
    };
    setEvaluation(ev);
    setScores(s => [...s, score]);
  }

  async function getHint() {
    if (!questions) return;
    setHintLoading(true);
    const q = questions[current];
    try {
      const h = await api.getHint(topic.name, q.question, q.options, hintLevel);
      setHint(h.hint); setHintLevel(l => l + 1);
    } catch (e) { setError((e as Error).message); }
    finally     { setHintLoading(false); }
  }

  function nextQuestion() {
    if (!questions) return;
    if (current + 1 >= questions.length) {
      setDone(true);
      // scores already includes all answers (setScores runs in selectOption before nextQuestion)
      const avg = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      api.saveProgress(topic.id, true, avg).catch(() => {});
    } else {
      setCurrent(c => c + 1);
      setSelected(null); setEvaluation(null); setHint(null); setHintLevel(1);
    }
  }

  const diff = DIFF_META[difficulty];
  const q = questions?.[current];
  const total = questions?.length ?? 5;

  /* ── Score Screen ── */
  if (done) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const correct = scores.filter(s => s >= 60).length;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "48px 24px" }}>
        <ScoreRing pct={avg} />

        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Correct",   value: correct,               color: "#34d399" },
            { label: "Incorrect", value: scores.length - correct, color: "#f87171" },
            { label: "Questions", value: scores.length,          color: "#818cf8" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "12px 20px", background: "#0d1117", border: "1px solid #1e2535", borderRadius: 12, minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {scores.map((s, i) => (
            <div key={i} style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              background: s >= 60 ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
              border: `1px solid ${s >= 60 ? "rgba(16,185,129,.3)" : "rgba(239,68,68,.3)"}`,
            }}>
              {s >= 60 ? "✓" : "✗"}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={loadQuiz} style={{ padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,.35)" }}>
            Try Again
          </button>
          <button onClick={() => { setDone(false); setQuestions(null); }} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #1e2535", cursor: "pointer", fontSize: 14, fontWeight: 500, background: "#0d1117", color: "#94a3b8" }}>
            Change Difficulty
          </button>
        </div>
      </div>
    );
  }

  /* ── Start Screen ── */
  if (!questions && !loading && !preparing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg, rgba(99,102,241,.2), rgba(34,211,238,.1))", border: "1px solid rgba(99,102,241,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🧠</div>

        <div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>Quiz: {topic.name}</h3>
          <p style={{ color: "#475569", fontSize: 14 }}>5 questions · AI-generated · instant feedback</p>
        </div>

        {/* Difficulty chips */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569", marginBottom: 12 }}>Select Difficulty</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["easy", "medium", "hard"] as const).map(d => {
              const m = DIFF_META[d];
              const active = difficulty === d;
              return (
                <button key={d} onClick={() => setDifficulty(d)} style={{
                  padding: "9px 22px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: active ? m.bg : "transparent",
                  border: `1px solid ${active ? m.border : "#1e2535"}`,
                  color: active ? m.color : "#475569",
                  transition: "all .15s",
                }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <button onClick={() => loadQuiz()} style={{ padding: "12px 40px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,.4)", letterSpacing: "-.1px" }}>
          Start Quiz →
        </button>

        {error && <div style={{ color: "#f87171", fontSize: 13, padding: "10px 16px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8 }}>{error}</div>}
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0" }}>
        <div className="loading" style={{ padding: 0 }}>
          <div className="spinner" />
          Loading {diff.label} quiz…
        </div>
        <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
          First time for this topic — generating questions (~45s). Instant on all future attempts.
        </div>
      </div>
    );
  }

  if (preparing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32 }}>⏳</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
            Questions being prepared
          </div>
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            The quiz bank for <strong style={{ color: "#818cf8" }}>{topic.name}</strong> is still being generated in the background.
            <br />Check back in a moment.
          </div>
        </div>
        <button
          onClick={() => loadQuiz()}
          style={{ padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,.35)" }}
        >
          Check again
        </button>
        <div style={{ fontSize: 11, color: "#1e3a5f" }}>
          Once ready, all quizzes load instantly from the database.
        </div>
      </div>
    );
  }

  /* ── Question ── */
  if (!q) return null;

  const pct = Math.round(((current) / total) * 100);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>

      {/* Progress header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#818cf8" }}>Question {current + 1}</span>
            <span style={{ color: "#1e2535" }}>/</span>
            <span style={{ fontSize: 13, color: "#475569" }}>{total}</span>
          </div>
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: diff.bg, color: diff.color, border: `1px solid ${diff.border}`, fontWeight: 600 }}>
            {diff.label}
          </span>
        </div>
        {/* Progress track */}
        <div style={{ height: 3, background: "#1e2535", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #22d3ee)", borderRadius: 99, transition: "width .4s ease" }} />
        </div>
        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, transition: "background .3s",
              background: i < current ? "#6366f1" : i === current ? "#818cf8" : "#1e2535",
            }} />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 16, padding: "28px 28px 22px", marginBottom: 16, boxShadow: "0 8px 32px rgba(0,0,0,.4)" }}>
        <p style={{ fontSize: 15.5, fontWeight: 500, color: "#e2e8f0", lineHeight: 1.75, margin: "0 0 24px" }}>
          {q.question}
        </p>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.options.map((opt, i) => {
            const isCorrect  = selected !== null && i === q.correct_index;
            const isWrong    = selected !== null && i === selected && i !== q.correct_index;
            const isSelected = selected !== null && i === selected;

            let bg     = "#080b12";
            let border = "#1e2535";
            let color  = "#94a3b8";
            let labelBg = "#111827";
            let labelColor = "#475569";

            if (isCorrect) {
              bg = "rgba(16,185,129,.08)"; border = "rgba(16,185,129,.4)"; color = "#d1fae5"; labelBg = "rgba(16,185,129,.2)"; labelColor = "#34d399";
            } else if (isWrong) {
              bg = "rgba(239,68,68,.07)"; border = "rgba(239,68,68,.4)"; color = "#fee2e2"; labelBg = "rgba(239,68,68,.2)"; labelColor = "#f87171";
            } else if (selected === null) {
              /* hover handled inline */
            }

            return (
              <button key={i} onClick={() => selectOption(i)} disabled={selected !== null}
                style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "13px 16px", background: bg, border: `1px solid ${border}`, borderRadius: 11, cursor: selected !== null ? "default" : "pointer", textAlign: "left", transition: "all .15s", width: "100%" }}
                onMouseEnter={e => { if (selected === null) { (e.currentTarget).style.borderColor = "#6366f155"; (e.currentTarget).style.background = "rgba(99,102,241,.06)"; } }}
                onMouseLeave={e => { if (selected === null) { (e.currentTarget).style.borderColor = "#1e2535"; (e.currentTarget).style.background = "#080b12"; } }}
              >
                <span style={{ width: 28, height: 28, borderRadius: 8, background: labelBg, color: labelColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: "JetBrains Mono, monospace", transition: "all .15s" }}>
                  {isCorrect ? "✓" : isWrong ? "✗" : OPTION_LABELS[i]}
                </span>
                <span style={{ fontSize: 14, color, lineHeight: 1.6, paddingTop: 4 }}>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hint */}
      {hint && (
        <div style={{ padding: "14px 18px", background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 11, marginBottom: 12, display: "flex", gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <span style={{ fontSize: 13, color: "#fcd34d", lineHeight: 1.65 }}>{hint}</span>
        </div>
      )}

      {/* Evaluation */}
      {evaluation && (
        <div style={{ padding: "16px 18px", background: evaluation.correct ? "rgba(16,185,129,.07)" : "rgba(239,68,68,.07)", border: `1px solid ${evaluation.correct ? "rgba(16,185,129,.25)" : "rgba(239,68,68,.25)"}`, borderRadius: 11, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: evaluation.correct ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)", color: evaluation.correct ? "#34d399" : "#f87171", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {evaluation.correct ? "✓" : "✗"}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: evaluation.correct ? "#34d399" : "#f87171" }}>
              {evaluation.correct ? "Correct!" : "Incorrect"}
            </span>
          </div>
          {(evaluation.feedback || evaluation.explanation) && (
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0, paddingLeft: 30 }}>
              {evaluation.feedback || evaluation.explanation}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {selected === null && (
            <button onClick={getHint} disabled={hintLoading} style={{ padding: "9px 18px", borderRadius: 9, border: "1px solid #1e2535", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, transition: "all .15s" }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = "#f59e0b44"; (e.currentTarget).style.color = "#fbbf24"; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = "#1e2535"; (e.currentTarget).style.color = "#64748b"; }}
            >
              {hintLoading ? <><div style={{ width: 12, height: 12, border: "2px solid #1e2535", borderTopColor: "#f59e0b", borderRadius: "50%", animation: "spin .7s linear infinite" }} /> Getting hint…</> : <><span>💡</span> Hint {hintLevel > 1 ? `(${hintLevel - 1} used)` : ""}</>}
            </button>
          )}
        </div>
        <div>
          {selected !== null && (
            <button onClick={nextQuestion} style={{ padding: "10px 28px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,.35)", display: "flex", alignItems: "center", gap: 8 }}>
              {current + 1 >= total ? "See Results" : "Next"} →
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13 }}>{error}</div>}
    </div>
  );
}
