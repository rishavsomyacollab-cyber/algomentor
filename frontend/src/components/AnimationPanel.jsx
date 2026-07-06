import { useState } from "react";
import { api } from "../api/client";

const COLOR_ALGORITHMS = {
  binary_search: ["binary_search"],
  bubble_sort: ["bubble_sort"],
  merge_sort: ["merge_sort"],
};

function getAlgoId(topicId) {
  for (const [algo, ids] of Object.entries(COLOR_ALGORITHMS)) {
    if (ids.includes(topicId)) return algo;
  }
  return topicId;
}

export default function AnimationPanel({ topic }) {
  const [inputStr, setInputStr] = useState("4 2 7 1 9 3 8 5");
  const [target, setTarget] = useState("7");
  const [data, setData] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoplay, setAutoplay] = useState(false);

  const needsTarget = topic.id === "binary_search";

  async function runAnimation() {
    setLoading(true);
    setError(null);
    setData(null);
    setStep(0);
    try {
      const arr = inputStr.trim().split(/\s+/).map(Number).filter((n) => !isNaN(n));
      const sortedArr = needsTarget ? [...arr].sort((a, b) => a - b) : arr;
      const t = needsTarget ? parseFloat(target) : null;
      const result = await api.animate(topic.id, topic.name, sortedArr, t);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentStep = data?.steps?.[step];
  const totalSteps = data?.steps?.length || 0;

  function getPointerLabels(idx) {
    if (!currentStep?.pointers) return "";
    return Object.entries(currentStep.pointers)
      .filter(([, v]) => v === idx)
      .map(([k]) => k.toUpperCase())
      .join(" ");
  }

  return (
    <div className="animation-panel">
      <div className="array-controls">
        <label>Array:</label>
        <input value={inputStr} onChange={(e) => setInputStr(e.target.value)} placeholder="space-separated numbers" />
        {needsTarget && (
          <>
            <label>Target:</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 70 }} />
          </>
        )}
        <button className="btn btn-primary" onClick={runAnimation} disabled={loading}>
          {loading ? "Generating…" : "Run Animation"}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {data && (
        <>
          <div className="array-display">
            {(currentStep?.array_state || data.steps[0].array_state).map((val, i) => {
              const colorClass = currentStep?.colors?.[String(i)] || "default";
              const ptrLabel = getPointerLabels(i);
              return (
                <div key={i} className="array-cell">
                  <div className="pointer-label">{ptrLabel}</div>
                  <div className={`cell-value ${colorClass}`}>{val}</div>
                  <div className="cell-index">{i}</div>
                </div>
              );
            })}
          </div>

          {currentStep && (
            <div className="step-info">
              <div className="step-desc">{currentStep.description || `Step ${currentStep.step_number}`}</div>
              <div className="step-meta">
                {currentStep.comparison && (
                  <span className="step-comparison">Compare: {currentStep.comparison}</span>
                )}
                {currentStep.decision && (
                  <span className="step-decision">→ {currentStep.decision}</span>
                )}
              </div>
            </div>
          )}

          <div className="step-controls">
            <button className="btn btn-secondary" onClick={() => setStep(0)} disabled={step === 0}>⏮</button>
            <button className="btn btn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>‹ Prev</button>
            <span className="step-counter">Step {step + 1} / {totalSteps}</span>
            <button className="btn btn-secondary" onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))} disabled={step >= totalSteps - 1}>Next ›</button>
            <button className="btn btn-secondary" onClick={() => setStep(totalSteps - 1)} disabled={step >= totalSteps - 1}>⏭</button>
          </div>

          {currentStep?.variables && Object.keys(currentStep.variables).length > 0 && (
            <div className="variables-table card" style={{ marginTop: 16 }}>
              <h3>Variables</h3>
              <table>
                <tbody>
                  {Object.entries(currentStep.variables).map(([k, v]) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
            Result: <strong style={{ color: "var(--success)" }}>{data.result}</strong>
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={{ color: "var(--text-muted)", padding: "32px 0", textAlign: "center", fontSize: 14 }}>
          Click "Run Animation" to visualize {topic.name} step by step.
        </div>
      )}
    </div>
  );
}
