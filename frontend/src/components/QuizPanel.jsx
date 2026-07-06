import { useState } from "react";
import { api } from "../api/client";

export default function QuizPanel({ topic }) {
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [hint, setHint] = useState(null);
  const [hintLevel, setHintLevel] = useState(1);
  const [scores, setScores] = useState([]);
  const [done, setDone] = useState(false);
  const [evalLoading, setEvalLoading] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  async function loadQuiz() {
    setLoading(true);
    setError(null);
    setQuestions(null);
    setCurrent(0);
    setSelected(null);
    setEvaluation(null);
    setHint(null);
    setHintLevel(1);
    setScores([]);
    setDone(false);
    try {
      const result = await api.generateQuiz(topic.id, topic.name, difficulty, 5);
      setQuestions(result.questions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectOption(idx) {
    if (selected !== null) return;
    setSelected(idx);
    setEvalLoading(true);
    const q = questions[current];
    try {
      const ev = await api.evaluateAnswer(topic.name, q.question, q.options, q.correct_index, idx);
      setEvaluation(ev);
      setScores((s) => [...s, ev.score || (ev.correct ? 100 : 0)]);
      await api.saveProgress(topic.id, false, ev.score || (ev.correct ? 100 : 0));
    } catch (e) {
      setError(e.message);
    } finally {
      setEvalLoading(false);
    }
  }

  async function getHint() {
    setHintLoading(true);
    const q = questions[current];
    try {
      const h = await api.getHint(topic.name, q.question, q.options, hintLevel);
      setHint(h.hint);
      setHintLevel((l) => l + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setHintLoading(false);
    }
  }

  function nextQuestion() {
    if (current + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setEvaluation(null);
      setHint(null);
      setHintLevel(1);
    }
  }

  if (done) {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return (
      <div className="quiz-panel">
        <div className="quiz-score">
          <div className="score-number">{avg}%</div>
          <div className="score-label">Average score across {scores.length} questions</div>
          <button className="btn btn-primary" onClick={loadQuiz}>Try Again</button>
        </div>
      </div>
    );
  }

  const q = questions?.[current];

  return (
    <div className="quiz-panel">
      <div className="quiz-header">
        <h3 style={{ fontSize: 16 }}>Quiz: {topic.name}</h3>
        <select
          className="difficulty-select"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          disabled={!!questions}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {!questions && !loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
            Ready to test your knowledge of {topic.name}?
          </p>
          <button className="btn btn-primary" onClick={loadQuiz}>Start Quiz</button>
        </div>
      )}

      {loading && <div className="loading"><div className="spinner" /> Generating quiz questions…</div>}
      {error && <div className="error-msg">{error}</div>}

      {q && (
        <div className="question-card">
          <div className="question-num">Question {current + 1} of {questions.length}</div>
          <div className="question-text">{q.question}</div>

          <div className="options">
            {q.options.map((opt, i) => {
              let cls = "option-btn";
              if (selected !== null) {
                if (i === q.correct_index) cls += " correct";
                else if (i === selected) cls += " incorrect";
              } else if (selected === i) {
                cls += " selected";
              }
              return (
                <button key={i} className={cls} onClick={() => selectOption(i)} disabled={selected !== null}>
                  {opt}
                </button>
              );
            })}
          </div>

          {hint && <div className="hint-box">💡 {hint}</div>}

          {evaluation && (
            <div className="explanation-box">
              <strong style={{ color: evaluation.correct ? "var(--success)" : "var(--danger)" }}>
                {evaluation.correct ? "Correct!" : "Incorrect."}{" "}
              </strong>
              {evaluation.feedback || evaluation.explanation}
            </div>
          )}

          {evalLoading && <div className="loading" style={{ padding: "10px 0" }}><div className="spinner" /> Evaluating…</div>}

          <div className="quiz-actions" style={{ marginTop: 14 }}>
            {selected === null && !evalLoading && (
              <button className="btn btn-secondary" onClick={getHint} disabled={hintLoading}>
                {hintLoading ? "…" : "Get Hint"}
              </button>
            )}
            {selected !== null && !evalLoading && (
              <button className="btn btn-primary" onClick={nextQuestion}>
                {current + 1 >= questions.length ? "See Results" : "Next Question →"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
