"use client";

import { useState } from "react";
import { api } from "@/lib/api";

const CATEGORIES = [
  { value: "suggestion", label: "💡 Suggestion" },
  { value: "bug",        label: "🐛 Bug Report" },
  { value: "content",    label: "📚 Content Issue" },
  { value: "other",      label: "💬 Other" },
];

interface FeedbackModalProps {
  onClose: () => void;
  topicId?: string;
  topicName?: string;
}

export default function FeedbackModal({ onClose, topicId, topicName }: FeedbackModalProps) {
  const [rating, setRating]       = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory]   = useState("");
  const [message, setMessage]     = useState("");
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setError("Please write a message."); return; }
    setError("");
    setSubmitting(true);
    try {
      await api.submitFeedback({
        message: message.trim(),
        rating:   rating || undefined,
        category: category || undefined,
        name:     name.trim() || undefined,
        email:    email.trim() || undefined,
        topic_id: topicId,
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", zIndex: 101,
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(480px, 95vw)",
        background: "#0d1117",
        border: "1px solid #1e2535",
        borderRadius: 16,
        boxShadow: "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #1e2535",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
              Share Feedback
            </div>
            {topicName && (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
                on <span style={{ color: "#818cf8" }}>{topicName}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#475569", fontSize: 18, lineHeight: 1,
              padding: "4px 6px", borderRadius: 6,
              transition: "color .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
            onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
          >✕</button>
        </div>

        {/* Success state */}
        {submitted ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
              Thanks for your feedback!
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 24 }}>
              It helps us make AlgoMentor better for everyone.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "8px 24px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                color: "#fff", fontSize: 14, fontWeight: 600,
                cursor: "pointer",
              }}
            >Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>

            {/* Star rating */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: ".05em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Overall Rating
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 28, padding: "2px 4px", lineHeight: 1,
                      transition: "transform .1s",
                      transform: (hoverRating || rating) >= star ? "scale(1.15)" : "scale(1)",
                      filter: (hoverRating || rating) >= star ? "none" : "grayscale(1) opacity(0.3)",
                    }}
                  >⭐</button>
                ))}
                {rating > 0 && (
                  <span style={{ fontSize: 12, color: "#818cf8", alignSelf: "center", marginLeft: 4 }}>
                    {["", "Poor", "Fair", "Good", "Great", "Excellent!"][rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: ".05em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Category
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(category === c.value ? "" : c.value)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                      cursor: "pointer", transition: "all .15s", border: "1px solid",
                      borderColor: category === c.value ? "#6366f1" : "#1e2535",
                      background: category === c.value ? "rgba(99,102,241,0.15)" : "transparent",
                      color: category === c.value ? "#a5b4fc" : "#64748b",
                    }}
                  >{c.label}</button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: ".05em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Message <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell us what you think, what's missing, or what could be better…"
                rows={4}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#0a0e16", border: "1px solid #1e2535",
                  borderRadius: 10, padding: "10px 14px",
                  color: "#e2e8f0", fontSize: 13, fontFamily: "inherit",
                  resize: "vertical", outline: "none",
                  transition: "border-color .15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)")}
                onBlur={e => (e.currentTarget.style.borderColor = "#1e2535")}
              />
            </div>

            {/* Name + Email row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Name", value: name, setter: setName, placeholder: "Optional" },
                { label: "Email", value: email, setter: setEmail, placeholder: "Optional" },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", letterSpacing: ".05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    {f.label}
                  </label>
                  <input
                    type={f.label === "Email" ? "email" : "text"}
                    value={f.value}
                    onChange={e => f.setter(e.target.value)}
                    placeholder={f.placeholder}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: "#0a0e16", border: "1px solid #1e2535",
                      borderRadius: 8, padding: "8px 12px",
                      color: "#e2e8f0", fontSize: 13, fontFamily: "inherit",
                      outline: "none", transition: "border-color .15s",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#1e2535")}
                  />
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>
                ⚠ {error}
              </div>
            )}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 18px", borderRadius: 8, fontSize: 13,
                  background: "none", border: "1px solid #1e2535",
                  color: "#64748b", cursor: "pointer", transition: "all .15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#334155")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1e2535")}
              >Cancel</button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "8px 22px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: submitting ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #818cf8)",
                  border: "none", color: "#fff", cursor: submitting ? "default" : "pointer",
                  transition: "opacity .15s",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Sending…" : "Send Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
