import { useState } from "react";

export default function CodePanel({ data }) {
  const [lang, setLang] = useState("pseudocode");
  if (!data) return null;

  const highlightedLines = {
    python: new Set(data.key_lines?.python || []),
    java: new Set(data.key_lines?.java || []),
  };

  function renderCode(code, highlighted) {
    return (code || "").split("\n").map((line, i) => (
      <span key={i} className={`code-line${highlighted.has(i + 1) ? " highlighted" : ""}`}>
        {line || " "}
      </span>
    ));
  }

  return (
    <div className="code-panel">
      <div className="lang-tabs">
        {["pseudocode", "python", "java"].map((l) => (
          <button key={l} className={`lang-tab${lang === l ? " active" : ""}`} onClick={() => setLang(l)}>
            {l === "pseudocode" ? "Pseudocode" : l === "python" ? "Python" : "Java"}
          </button>
        ))}
      </div>

      <div className="code-block-wrap">
        {lang === "pseudocode" ? (
          <pre className="pseudocode-block">{data.pseudocode}</pre>
        ) : (
          <pre className="code-block">
            {renderCode(data[lang] || "", highlightedLines[lang])}
          </pre>
        )}
      </div>

      {lang !== "pseudocode" && data.line_notes?.[lang] && Object.keys(data.line_notes[lang]).length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Key Lines Explained</h3>
          {Object.entries(data.line_notes[lang]).map(([line, note]) => (
            <div key={line} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--primary-light)", minWidth: 24 }}>
                L{line}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
