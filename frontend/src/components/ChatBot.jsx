import { useState, useRef, useEffect } from "react";
import { api } from "../api/client";

export default function ChatBot({ currentTopic }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask me anything about DSA algorithms, data structures, or the topic you're studying." }
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const data = await api.chat(text, currentTopic?.name || null);
      setMessages(prev => [...prev, { role: "bot", text: data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "bot", text: "Sorry, something went wrong. Please try again.", error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 52, height: 52, borderRadius: "50%",
          background: open ? "#4f46e5" : "var(--primary)",
          border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(108,99,255,.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, transition: "background .2s, transform .2s",
          transform: open ? "rotate(180deg)" : "none",
        }}
        title="Ask the AI tutor"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 999,
          width: 360, maxWidth: "calc(100vw - 48px)",
          height: 480, maxHeight: "calc(100vh - 120px)",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.45)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 18px", borderBottom: "1px solid var(--border)",
            background: "rgba(108,99,255,.1)",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>AlgoMentor AI</div>
              {currentTopic && (
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  Studying: {currentTopic.name}
                </div>
              )}
            </div>
            <div style={{
              marginLeft: "auto", width: 8, height: 8, borderRadius: "50%",
              background: loading ? "#fbbf24" : "#4ade80",
              boxShadow: `0 0 6px ${loading ? "#fbbf24" : "#4ade80"}`,
            }} />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 0" }}>
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} style={{ height: 14 }} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 14px", borderTop: "1px solid var(--border)",
            display: "flex", gap: 8, flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask anything about DSA…"
              rows={1}
              style={{
                flex: 1, resize: "none", padding: "9px 12px",
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 10, color: "var(--text)", fontSize: 13,
                fontFamily: "inherit", outline: "none", lineHeight: 1.5,
              }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 10, border: "none",
                background: input.trim() && !loading ? "var(--primary)" : "var(--border)",
                color: "white", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0, alignSelf: "flex-end",
                transition: "background .15s",
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  const text   = message.text || "";

  // Render code blocks in bot messages
  const parts = isUser ? null : text.split(/(```[\s\S]*?```)/g);

  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 10,
    }}>
      {!isUser && (
        <span style={{
          width: 28, height: 28, borderRadius: "50%", background: "rgba(108,99,255,.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginRight: 8, alignSelf: "flex-end",
        }}>🤖</span>
      )}
      <div style={{
        maxWidth: "82%",
        padding: isUser ? "9px 13px" : "10px 13px",
        borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
        background: isUser
          ? "var(--primary)"
          : message.error ? "rgba(239,68,68,.12)" : "var(--bg)",
        border: isUser ? "none" : `1px solid ${message.error ? "rgba(239,68,68,.25)" : "var(--border)"}`,
        color: isUser ? "white" : "var(--text)",
        fontSize: 13, lineHeight: 1.65,
        wordBreak: "break-word",
      }}>
        {isUser ? (
          text
        ) : (
          (parts || [text]).map((part, i) => {
            if (part.startsWith("```")) {
              const lang  = part.match(/^```(\w*)/)?.[1] || "";
              const code  = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
              return (
                <pre key={i} style={{
                  margin: "8px 0", padding: "10px 12px",
                  background: "var(--bg-card)", borderRadius: 8,
                  fontFamily: "JetBrains Mono, monospace", fontSize: 12,
                  color: "#a5f3fc", overflowX: "auto", lineHeight: 1.6,
                  border: "1px solid var(--border)",
                }}>
                  {lang && <span style={{ color: "var(--text-muted)", fontSize: 10, display: "block", marginBottom: 4 }}>{lang}</span>}
                  {code.trim()}
                </pre>
              );
            }
            return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
          })
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{
        width: 28, height: 28, borderRadius: "50%", background: "rgba(108,99,255,.2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
      }}>🤖</span>
      <div style={{
        padding: "10px 14px", background: "var(--bg)", border: "1px solid var(--border)",
        borderRadius: "14px 14px 14px 4px", display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: "var(--primary)",
            display: "inline-block",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
