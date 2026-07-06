import { useState, useEffect } from "react";
import { api } from "../api/client";

const CATEGORY_LABELS = {
  searching: "Searching",
  sorting: "Sorting",
  arrays: "Arrays & Strings",
  graphs: "Graphs & Trees",
  dynamic_programming: "Dynamic Programming",
  data_structures: "Data Structures",
};

export default function TopicMap({ onSelect }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTopics()
      .then(setTopics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /> Loading topics…</div>;
  if (error) return <div className="error-msg">Failed to load topics: {error}</div>;

  const grouped = topics.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {});

  const completed = topics.filter((t) => t.progress?.completed).length;

  return (
    <div className="topic-map">
      <h2>DSA Topic Map</h2>
      <p className="subtitle">Pick a topic to learn, visualize, and quiz yourself.</p>

      <div className="progress-bar-wrap">
        <div className="label">{completed} / {topics.length} topics completed</div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(completed / Math.max(topics.length, 1)) * 100}%` }} />
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="category-section">
          <h3>{CATEGORY_LABELS[cat] || cat}</h3>
          <div className="topic-grid">
            {items.map((t) => (
              <div key={t.id} className="topic-card" onClick={() => onSelect(t)}>
                <div className="card-name">{t.name}</div>
                <div className="card-desc">{t.description}</div>
                <div className="badges">
                  <span className={`badge badge-${t.difficulty}`}>{t.difficulty}</span>
                  {t.progress?.completed ? <span className="badge badge-done">✓ done</span> : null}
                  {t.progress?.quiz_best_score > 0 && !t.progress?.completed
                    ? <span className="badge" style={{ background: "rgba(59,130,246,.15)", color: "#60a5fa" }}>
                        quiz {t.progress.quiz_best_score}%
                      </span>
                    : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
