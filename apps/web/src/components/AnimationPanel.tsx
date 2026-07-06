"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Topic, AnimationData, AnimationStep } from "@/lib/types";

/* ── Color state → visual style ─────────────────────────────────────────── */
const STATE_STYLES: Record<string, { bg: string; border: string; color: string; glow?: string }> = {
  default:   { bg: "#111827",              border: "#1e2535",              color: "#94a3b8" },
  active:    { bg: "rgba(99,102,241,.2)",  border: "#6366f1",              color: "#818cf8", glow: "0 0 14px rgba(99,102,241,.4)" },
  comparing: { bg: "rgba(245,158,11,.18)", border: "#f59e0b",              color: "#fbbf24", glow: "0 0 14px rgba(245,158,11,.35)" },
  sorted:    { bg: "rgba(16,185,129,.15)", border: "#10b981",              color: "#34d399", glow: "0 0 14px rgba(16,185,129,.3)" },
  merging:   { bg: "rgba(59,130,246,.18)", border: "#3b82f6",              color: "#60a5fa", glow: "0 0 14px rgba(59,130,246,.3)" },
  found:     { bg: "rgba(16,185,129,.25)", border: "#10b981",              color: "#34d399", glow: "0 0 18px rgba(16,185,129,.5)" },
  pivot:     { bg: "rgba(236,72,153,.18)", border: "#ec4899",              color: "#f472b6", glow: "0 0 14px rgba(236,72,153,.35)" },
  boundary:  { bg: "rgba(148,163,184,.08)", border: "#475569",             color: "#64748b" },
};

const PTR_COLORS: Record<string, string> = {
  left: "#818cf8", right: "#f472b6", mid: "#fbbf24",
  low: "#818cf8", high: "#f472b6", i: "#34d399", j: "#60a5fa",
};

interface AnimationPanelProps { topic: Topic; }

export default function AnimationPanel({ topic }: AnimationPanelProps) {
  const [inputStr, setInputStr]   = useState("4 2 7 1 9 3 8 5");
  const [target, setTarget]       = useState("7");
  const [data, setData]           = useState<AnimationData | null>(null);
  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [playing, setPlaying]     = useState(false);
  const [speed, setSpeed]         = useState(800);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  const needsTarget = topic.id === "binary_search";
  const totalSteps  = data?.steps?.length ?? 0;

  /* Auto-play */
  const stopPlay = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPlaying(false);
  }, []);

  useEffect(() => {
    if (playing && data) {
      intervalRef.current = setInterval(() => {
        setStep(s => {
          if (s >= totalSteps - 1) { stopPlay(); return s; }
          return s + 1;
        });
      }, speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed, totalSteps, data, stopPlay]);

  async function runAnimation() {
    stopPlay();
    setLoading(true); setError(null); setData(null); setStep(0);
    try {
      const arr = inputStr.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
      const sortedArr = needsTarget ? [...arr].sort((a, b) => a - b) : arr;
      const t = needsTarget ? parseFloat(target) : null;
      const result = await api.animate(topic.id, topic.name, sortedArr, t);
      if (result.simulation_available === false) {
        setData(result);   // store so we can show the unsupported screen
        return;
      }
      setData(result);
    } catch (e) { setError((e as Error).message); }
    finally     { setLoading(false); }
  }

  function togglePlay() {
    if (playing) { stopPlay(); return; }
    if (step >= totalSteps - 1) setStep(0);
    setPlaying(true);
  }

  const currentStep: AnimationStep | undefined = data?.steps?.[step];

  function getPointerLabels(idx: number): { label: string; color: string }[] {
    if (!currentStep?.pointers) return [];
    return Object.entries(currentStep.pointers)
      .filter(([, v]) => v === idx)
      .map(([k]) => ({ label: k.toUpperCase(), color: PTR_COLORS[k.toLowerCase()] ?? "#818cf8" }));
  }

  const pct = totalSteps > 1 ? Math.round((step / (totalSteps - 1)) * 100) : 0;

  /* ── Parse array for preview chips ── */
  const previewArr = inputStr.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));

  /* ── Empty / setup state ── */
  const showSetup = !data && !loading;

  // Show unsupported screen for dynamic topics without a simulation
  if (data && data.simulation_available === false) {
    return (
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{
          padding: "48px 32px", textAlign: "center",
          background: "#0d1117", border: "1px solid #1e2535",
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔬</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>
            Step-by-step animation not available yet for {topic.name}
          </div>
          <div style={{ fontSize: 14, color: "#475569", maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.7 }}>
            Visual simulation currently supports <strong style={{ color: "#818cf8" }}>Binary Search</strong>, <strong style={{ color: "#818cf8" }}>Bubble Sort</strong>, and <strong style={{ color: "#818cf8" }}>Merge Sort</strong>.
            Use the <strong style={{ color: "#34d399" }}>Learn</strong> tab for a worked example, or the <strong style={{ color: "#fbbf24" }}>Code</strong> tab to trace through the implementation.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {["Binary Search", "Bubble Sort", "Merge Sort"].map(name => (
              <span key={name} style={{
                fontSize: 12, padding: "6px 14px", borderRadius: 99, fontWeight: 600,
                background: "rgba(99,102,241,.1)", color: "#818cf8",
                border: "1px solid rgba(99,102,241,.2)",
              }}>{name}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>

      {/* ── Controls bar ── */}
      <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>

          {/* Array input */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>Array</div>
            <input
              value={inputStr}
              onChange={e => setInputStr(e.target.value)}
              placeholder="space-separated numbers"
              style={{ width: "100%", padding: "9px 14px", background: "#070a10", border: "1px solid #1e2535", borderRadius: 9, color: "#e2e8f0", fontSize: 13, fontFamily: "JetBrains Mono, monospace", outline: "none", transition: "border-color .15s" }}
              onFocus={e => (e.currentTarget.style.borderColor = "#6366f155")}
              onBlur={e  => (e.currentTarget.style.borderColor = "#1e2535")}
            />
          </div>

          {/* Target (binary search only) */}
          {needsTarget && (
            <div style={{ width: 90 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>Target</div>
              <input
                value={target}
                onChange={e => setTarget(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "#070a10", border: "1px solid #1e2535", borderRadius: 9, color: "#e2e8f0", fontSize: 13, fontFamily: "JetBrains Mono, monospace", outline: "none", transition: "border-color .15s" }}
                onFocus={e => (e.currentTarget.style.borderColor = "#6366f155")}
                onBlur={e  => (e.currentTarget.style.borderColor = "#1e2535")}
              />
            </div>
          )}

          {/* Speed */}
          {data && (
            <div style={{ width: 120 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569" }}>Speed</span>
                <span style={{ fontSize: 11, color: "#6366f1", fontFamily: "JetBrains Mono, monospace" }}>{speed === 200 ? "Fast" : speed === 800 ? "Med" : "Slow"}</span>
              </div>
              <input type="range" min={200} max={1400} step={200} value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#6366f1", cursor: "pointer" }}
              />
            </div>
          )}

          {/* Run button */}
          <button
            onClick={runAnimation}
            disabled={loading}
            style={{ padding: "9px 22px", borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,.3)", opacity: loading ? .6 : 1, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", alignSelf: "flex-end" }}
          >
            {loading ? <><div style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .6s linear infinite" }} /> Generating…</> : "▶ Run"}
          </button>
        </div>

        {/* Preview chips */}
        {showSetup && previewArr.length > 0 && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 14 }}>
            {previewArr.map((v, i) => (
              <span key={i} style={{ padding: "3px 10px", background: "#070a10", border: "1px solid #1e2535", borderRadius: 7, fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#64748b" }}>
                {v}
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, color: "#f87171", fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "60px 0" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #1e2535", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
          <span style={{ color: "#475569", fontSize: 14 }}>Generating {topic.name} animation…</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {showSetup && !loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "52px 0", color: "#334155" }}>
          <div style={{ fontSize: 48, filter: "grayscale(0.3)" }}>▶</div>
          <div style={{ fontSize: 14, textAlign: "center", maxWidth: 300 }}>
            Configure the array above and hit <span style={{ color: "#818cf8", fontWeight: 600 }}>Run</span> to watch {topic.name} step by step
          </div>
        </div>
      )}

      {/* ── Visualization ── */}
      {data && !loading && (
        <>
          {/* Array display */}
          <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 14, padding: "28px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "center" }}>
              {(currentStep?.array_state ?? data.steps[0].array_state).map((val, i) => {
                const colorKey = currentStep?.colors?.[String(i)] ?? "default";
                const style    = STATE_STYLES[colorKey] ?? STATE_STYLES.default;
                const ptrs     = getPointerLabels(i);

                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 48 }}>
                    {/* Pointer label */}
                    <div style={{ height: 18, display: "flex", gap: 3 }}>
                      {ptrs.map(p => (
                        <span key={p.label} style={{ fontSize: 9, fontWeight: 800, color: p.color, fontFamily: "JetBrains Mono, monospace", padding: "1px 5px", background: p.color + "22", borderRadius: 4, letterSpacing: ".05em" }}>
                          {p.label}
                        </span>
                      ))}
                    </div>

                    {/* Cell */}
                    <div style={{ width: 52, height: 52, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", background: style.bg, border: `2px solid ${style.border}`, color: style.color, boxShadow: style.glow ?? "none", transition: "all .25s ease" }}>
                      {val}
                    </div>

                    {/* Index */}
                    <span style={{ fontSize: 10, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>{i}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step info card */}
          {currentStep && (
            <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 12, padding: "16px 20px", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(99,102,241,.15)", border: "1px solid rgba(99,102,241,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#818cf8", flexShrink: 0, fontFamily: "JetBrains Mono, monospace" }}>
                  {currentStep.step_number ?? step + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, color: "#e2e8f0", lineHeight: 1.65, margin: "0 0 8px" }}>
                    {currentStep.description ?? `Step ${step + 1}`}
                  </p>
                  {(currentStep.comparison || currentStep.decision) && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {currentStep.comparison && (
                        <span style={{ fontSize: 12, padding: "4px 12px", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 7, color: "#fbbf24", fontFamily: "JetBrains Mono, monospace" }}>
                          {currentStep.comparison}
                        </span>
                      )}
                      {currentStep.decision && (
                        <span style={{ fontSize: 12, padding: "4px 12px", background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", borderRadius: 7, color: "#818cf8" }}>
                          → {currentStep.decision}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Player controls */}
          <div style={{ background: "#0d1117", border: "1px solid #1e2535", borderRadius: 12, padding: "14px 20px", marginBottom: 14 }}>
            {/* Progress bar */}
            <div style={{ height: 3, background: "#1e2535", borderRadius: 99, overflow: "hidden", marginBottom: 12, cursor: "pointer" }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                setStep(Math.round(ratio * (totalSteps - 1)));
              }}
            >
              <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #6366f1, #22d3ee)", borderRadius: 99, transition: "width .15s linear" }} />
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {/* Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* First */}
                <CtrlBtn onClick={() => { stopPlay(); setStep(0); }} disabled={step === 0} title="First">⏮</CtrlBtn>
                {/* Prev */}
                <CtrlBtn onClick={() => { stopPlay(); setStep(s => Math.max(0, s - 1)); }} disabled={step === 0} title="Previous">‹</CtrlBtn>
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  title={playing ? "Pause" : "Play"}
                  style={{ width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", boxShadow: "0 2px 12px rgba(99,102,241,.35)", transition: "all .15s" }}
                >
                  {playing ? "⏸" : "▶"}
                </button>
                {/* Next */}
                <CtrlBtn onClick={() => { stopPlay(); setStep(s => Math.min(totalSteps - 1, s + 1)); }} disabled={step >= totalSteps - 1} title="Next">›</CtrlBtn>
                {/* Last */}
                <CtrlBtn onClick={() => { stopPlay(); setStep(totalSteps - 1); }} disabled={step >= totalSteps - 1} title="Last">⏭</CtrlBtn>
              </div>

              {/* Step counter */}
              <span style={{ fontSize: 12, color: "#475569", fontFamily: "JetBrains Mono, monospace" }}>
                <span style={{ color: "#818cf8", fontWeight: 700 }}>{step + 1}</span>
                <span style={{ color: "#1e2535", margin: "0 4px" }}>/</span>
                {totalSteps}
              </span>
            </div>
          </div>

          {/* Variables & result row */}
          <div style={{ display: "grid", gridTemplateColumns: currentStep?.variables && Object.keys(currentStep.variables).length > 0 ? "1fr auto" : "1fr", gap: 12 }}>

            {/* Result */}
            <div style={{ padding: "12px 18px", background: "#0d1117", border: "1px solid rgba(16,185,129,.2)", borderRadius: 11, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569" }}>Result</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#34d399", fontFamily: "JetBrains Mono, monospace" }}>{data.result ?? "—"}</span>
            </div>

            {/* Variables */}
            {currentStep?.variables && Object.keys(currentStep.variables).length > 0 && (
              <div style={{ padding: "12px 18px", background: "#0d1117", border: "1px solid #1e2535", borderRadius: 11, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(currentStep.variables).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#64748b" }}>{k}</span>
                    <span style={{ fontSize: 11, color: "#334155" }}>=</span>
                    <span style={{ fontSize: 12, fontFamily: "JetBrains Mono, monospace", color: "#818cf8", fontWeight: 700 }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color legend */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, padding: "10px 16px", background: "#070a10", borderRadius: 10, border: "1px solid #111827" }}>
            {Object.entries(STATE_STYLES)
              .filter(([k]) => k !== "default" && k !== "boundary")
              .map(([k, s]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.bg, border: `1.5px solid ${s.border}` }} />
                  <span style={{ fontSize: 11, color: "#334155", textTransform: "capitalize" }}>{k}</span>
                </div>
              ))}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Small control button ─────────────────────────────────────────────────── */
function CtrlBtn({ onClick, disabled, children, title }: { onClick: () => void; disabled: boolean; children: React.ReactNode; title: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #1e2535", background: disabled ? "transparent" : "#111827", color: disabled ? "#1e2535" : "#64748b", cursor: disabled ? "not-allowed" : "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget).style.borderColor = "#6366f155"; }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget).style.borderColor = "#1e2535"; }}
    >
      {children}
    </button>
  );
}
