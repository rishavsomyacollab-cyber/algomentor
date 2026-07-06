"use client";

import { useState } from "react";
import type { PseudocodeData } from "@/lib/types";

type LangTab = "pseudocode" | "python" | "java";

const LANG_META: Record<LangTab, { label: string; icon: string; file: string; color: string }> = {
  pseudocode: { label: "Pseudocode", icon: "📋", file: "algorithm.pseudo", color: "#a78bfa" },
  python:     { label: "Python",     icon: "🐍", file: "solution.py",      color: "#fbbf24" },
  java:       { label: "Java",       icon: "☕", file: "Solution.java",    color: "#60a5fa" },
};

/* ── Very lightweight syntax tokeniser ─────────────────────────────────── */
type Token = { type: "keyword"|"string"|"comment"|"number"|"decorator"|"builtin"|"plain"; text: string };

const PY_KW  = /^(def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|import|from|as|pass|break|continue|lambda|with|try|except|finally|raise|yield|global|nonlocal|assert|del)\b/;
const PY_BLT = /^(len|range|print|int|str|float|list|dict|set|tuple|enumerate|zip|map|filter|sorted|reversed|min|max|sum|abs|type|isinstance|hasattr|getattr|setattr)\b/;
const JAVA_KW= /^(public|private|protected|static|final|class|interface|extends|implements|new|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|throws|void|int|long|double|float|boolean|char|String|null|true|false|import|package|this|super|instanceof)\b/;

function tokenise(line: string, lang: "python"|"java"): Token[] {
  const tokens: Token[] = [];
  let rest = line;

  while (rest.length > 0) {
    // Comment
    if (lang === "python" && rest.startsWith("#")) {
      tokens.push({ type: "comment", text: rest }); break;
    }
    if (lang === "java" && rest.startsWith("//")) {
      tokens.push({ type: "comment", text: rest }); break;
    }
    // String
    if (rest[0] === '"' || rest[0] === "'") {
      const q = rest[0], end = rest.indexOf(q, 1);
      const n = end === -1 ? rest.length : end + 1;
      tokens.push({ type: "string", text: rest.slice(0, n) });
      rest = rest.slice(n); continue;
    }
    // Decorator (Python)
    if (lang === "python" && rest[0] === "@") {
      const m = rest.match(/^@[\w.]+/);
      const n = m ? m[0].length : 1;
      tokens.push({ type: "decorator", text: rest.slice(0, n) }); rest = rest.slice(n); continue;
    }
    // Number
    const numMatch = rest.match(/^\d+(\.\d+)?/);
    if (numMatch) {
      tokens.push({ type: "number", text: numMatch[0] }); rest = rest.slice(numMatch[0].length); continue;
    }
    // Keyword / builtin
    const kwRe = lang === "python" ? PY_KW : JAVA_KW;
    const kwM  = rest.match(kwRe);
    if (kwM) { tokens.push({ type: "keyword", text: kwM[0] }); rest = rest.slice(kwM[0].length); continue; }
    if (lang === "python") {
      const bM = rest.match(PY_BLT);
      if (bM) { tokens.push({ type: "builtin", text: bM[0] }); rest = rest.slice(bM[0].length); continue; }
    }
    // Plain char
    tokens.push({ type: "plain", text: rest[0] }); rest = rest.slice(1);
  }

  // Merge adjacent same-type
  const merged: Token[] = [];
  for (const t of tokens) {
    if (merged.length > 0 && merged[merged.length - 1].type === t.type) {
      merged[merged.length - 1].text += t.text;
    } else { merged.push({ ...t }); }
  }
  return merged;
}

const TOKEN_COLORS: Record<Token["type"], string> = {
  keyword:   "#c084fc",
  string:    "#86efac",
  comment:   "#475569",
  number:    "#fb923c",
  decorator: "#38bdf8",
  builtin:   "#67e8f9",
  plain:     "#e2e8f0",
};

interface CodePanelProps { data: PseudocodeData | null; topicId?: string; }

const LANG_SS_KEY = "code_lang";
const VALID_LANGS: LangTab[] = ["pseudocode", "python", "java"];

export default function CodePanel({ data, topicId }: CodePanelProps) {
  const [lang, setLang] = useState<LangTab>(() => {
    try {
      const saved = sessionStorage.getItem(LANG_SS_KEY);
      return (VALID_LANGS.includes(saved as LangTab) ? saved : "pseudocode") as LangTab;
    } catch { return "pseudocode"; }
  });
  const [copied, setCopied]   = useState(false);
  const [hovLine, setHovLine] = useState<number | null>(null);

  if (!data) return null;

  const meta = LANG_META[lang];
  const highlighted = new Set<number>(
    lang !== "pseudocode" ? (data.key_lines?.[lang as "python"|"java"] ?? []) : []
  );
  const lineNotes = lang !== "pseudocode" ? (data.line_notes?.[lang as "python"|"java"] ?? {}) : {};
  const rawCode   = lang === "pseudocode" ? data.pseudocode : data[lang as "python"|"java"];
  const codeStr   = typeof rawCode === "string" ? rawCode : "";

  async function copy() {
    await navigator.clipboard.writeText(codeStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const lines = codeStr.split("\n");
  const isEmpty = lang !== "pseudocode" && !codeStr.trim();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>

      {/* ── Language selector ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["pseudocode", "python", "java"] as LangTab[]).map(l => {
            const m = LANG_META[l];
            const active = lang === l;
            return (
              <button key={l} onClick={() => { setLang(l); try { sessionStorage.setItem(LANG_SS_KEY, l); } catch {} }} style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 16px", borderRadius: 10, border: `1px solid ${active ? m.color + "44" : "#1e2535"}`,
                background: active ? m.color + "15" : "transparent",
                color: active ? m.color : "#475569",
                cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
                transition: "all .15s",
              }}>
                <span>{m.icon}</span>
                <span>{m.label}</span>
                {active && <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, display: "inline-block" }} />}
              </button>
            );
          })}
        </div>

        {/* Copy button */}
        <button onClick={copy} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 16px",
          background: copied ? "rgba(16,185,129,.12)" : "#0d1117",
          border: `1px solid ${copied ? "rgba(16,185,129,.3)" : "#1e2535"}`,
          borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600,
          color: copied ? "#34d399" : "#475569", transition: "all .2s",
        }}>
          {copied ? <><span>✓</span> Copied!</> : <><span>⎘</span> Copy</>}
        </button>
      </div>

      {/* ── Code window ── */}
      <div style={{ background: "#070a10", border: "1px solid #1e2535", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,.5)" }}>

        {/* Title bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "#0d1117", borderBottom: "1px solid #1e2535" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
          <div style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#334155", fontFamily: "JetBrains Mono, monospace" }}>{meta.file}</span>
            {highlighted.size > 0 && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: meta.color + "18", color: meta.color, border: `1px solid ${meta.color}33`, fontWeight: 600 }}>
                {highlighted.size} key lines
              </span>
            )}
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11, color: "#1e2535", fontFamily: "JetBrains Mono, monospace" }}>
            {lines.length} lines
          </div>
        </div>

        {/* Code body */}
        {isEmpty ? (
          <div style={{ padding: "40px 28px", textAlign: "center", color: "#475569", fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
            Code for this language is being generated — check back shortly or try Pseudocode.
          </div>
        ) : lang === "pseudocode" ? (
          /* Pseudocode — special document-style rendering */
          <div style={{ padding: "24px 28px" }}>
            {lines.map((line, i) => {
              const trimmed = line.trimStart();
              const indent  = line.length - trimmed.length;
              const isHead  = /^(Algorithm|Function|Procedure|Input|Output|Return|Step)/i.test(trimmed);
              const isKw    = /^(if|else|elif|for|while|do|begin|end|return|then|repeat|until)\b/i.test(trimmed);
              const isComment = trimmed.startsWith("//") || trimmed.startsWith("#");

              return (
                <div key={i} style={{ display: "flex", gap: 0, lineHeight: 1.9, marginLeft: indent * 6 }}>
                  {isHead ? (
                    <span style={{ fontSize: 13, color: "#818cf8", fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{trimmed}</span>
                  ) : isKw ? (
                    <span style={{ fontSize: 13, fontFamily: "JetBrains Mono, monospace" }}>
                      <span style={{ color: "#c084fc", fontWeight: 600 }}>{trimmed.match(/^\w+/)?.[0]}</span>
                      <span style={{ color: "#cbd5e1" }}>{trimmed.slice(trimmed.match(/^\w+/)?.[0].length ?? 0)}</span>
                    </span>
                  ) : isComment ? (
                    <span style={{ fontSize: 13, color: "#334155", fontStyle: "italic", fontFamily: "JetBrains Mono, monospace" }}>{trimmed}</span>
                  ) : (
                    <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "JetBrains Mono, monospace" }}>{trimmed}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Python / Java — editor-style with line numbers */
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 52 }} />
                <col />
              </colgroup>
              <tbody>
                {lines.map((line, i) => {
                  const lineNum    = i + 1;
                  const isHighlit  = highlighted.has(lineNum);
                  const hasNote    = lineNum.toString() in lineNotes;
                  const isHov      = hovLine === lineNum;

                  return (
                    <tr
                      key={i}
                      onMouseEnter={() => setHovLine(lineNum)}
                      onMouseLeave={() => setHovLine(null)}
                      style={{ background: isHighlit ? "rgba(99,102,241,.1)" : isHov ? "rgba(255,255,255,.02)" : "transparent", cursor: hasNote ? "pointer" : "default" }}
                    >
                      {/* Line number gutter */}
                      <td style={{ padding: "0 14px", textAlign: "right", userSelect: "none", verticalAlign: "top", borderRight: isHighlit ? "2px solid #6366f1" : "2px solid transparent" }}>
                        <span style={{ fontSize: 11, color: isHighlit ? "#818cf8" : "#2d3748", fontFamily: "JetBrains Mono, monospace", lineHeight: "22px", display: "inline-block" }}>
                          {lineNum}
                        </span>
                      </td>

                      {/* Code content */}
                      <td style={{ padding: "0 20px 0 14px", verticalAlign: "top" }}>
                        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 13, lineHeight: "22px", display: "inline-block", whiteSpace: "pre" }}>
                          {tokenise(line, lang as "python"|"java").map((tok, ti) => (
                            <span key={ti} style={{ color: TOKEN_COLORS[tok.type] }}>{tok.text}</span>
                          ))}
                          {line === "" && " "}
                        </span>
                        {/* Inline note pill on highlighted lines */}
                        {hasNote && isHov && (
                          <span style={{ marginLeft: 14, fontSize: 11, padding: "2px 10px", borderRadius: 99, background: "rgba(99,102,241,.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,.25)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            {lineNotes[lineNum.toString()]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Key Lines panel ── */}
      {Object.keys(lineNotes).length > 0 && (
        <div style={{ marginTop: 16, background: "#0d1117", border: "1px solid #1e2535", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e2535", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#475569" }}>Key Lines Explained</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: meta.color + "15", color: meta.color, fontWeight: 600 }}>
              {Object.keys(lineNotes).length}
            </span>
          </div>
          <div style={{ padding: "8px 0" }}>
            {Object.entries(lineNotes).map(([lineNum, note], i) => (
              <div key={lineNum} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "10px 20px", borderBottom: i < Object.keys(lineNotes).length - 1 ? "1px solid #0d1117" : "none", background: hovLine === Number(lineNum) ? "rgba(99,102,241,.05)" : "transparent", transition: "background .12s" }}
                onMouseEnter={() => setHovLine(Number(lineNum))}
                onMouseLeave={() => setHovLine(null)}
              >
                <span style={{ minWidth: 34, height: 22, borderRadius: 7, background: "rgba(99,102,241,.12)", color: "#818cf8", fontFamily: "JetBrains Mono, monospace", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  L{lineNum}
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.65 }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
