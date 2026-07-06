"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import TopicMap from "@/components/TopicMap";
import TopicView from "@/components/TopicView";
import ChatBot from "@/components/ChatBot";
import FeedbackModal from "@/components/FeedbackModal";
import { useTopicStore } from "@/store/useTopicStore";
import { useAuthStore } from "@/store/useAuthStore";
import type { Topic } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { selectedTopic, setSelectedTopic } = useTopicStore();
  const { user, isAuthenticated, isLoading, hydrate, logout } = useAuthStore();
  const [showFeedback, setShowFeedback] = useState(false);

  // On mount try to restore session from refresh token cookie
  useEffect(() => { hydrate(); }, [hydrate]);

  // Redirect to login if not authenticated after hydration
  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  // Restore active topic on page refresh (or deep-link from dashboard)
  useEffect(() => {
    const deepLink = sessionStorage.getItem("openTopic");
    if (deepLink) {
      try { setSelectedTopic(JSON.parse(deepLink)); } catch {}
      sessionStorage.removeItem("openTopic");
      return;
    }
    const saved = sessionStorage.getItem("currentTopic");
    if (saved) {
      try { setSelectedTopic(JSON.parse(saved)); } catch {}
    }
  }, [setSelectedTopic]);

  // Persist active topic to sessionStorage so refresh lands back on the same topic
  useEffect(() => {
    if (selectedTopic) {
      sessionStorage.setItem("currentTopic", JSON.stringify(selectedTopic));
    } else {
      sessionStorage.removeItem("currentTopic");
    }
  }, [selectedTopic]);

  // Show nothing while checking session
  if (isLoading || !isAuthenticated) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 32px", height: 60,
        background: "rgba(7,9,15,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        position: "sticky", top: 0, zIndex: 40,
        boxShadow: "0 1px 0 rgba(255,255,255,0.03), 0 4px 24px rgba(0,0,0,0.4)",
      }}>

        {/* Logo */}
        <button
          onClick={() => setSelectedTopic(null)}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: "#fff",
            boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
          }}>A</div>
          <span style={{
            fontSize: 16, fontWeight: 700, letterSpacing: "-.2px",
            background: "linear-gradient(135deg, #e2e8f0 0%, #818cf8 60%, #22d3ee 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            AlgoMentor
          </span>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.08)" }} />

        <span style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: ".02em" }}>
          AI-Powered DSA Learning OS
        </span>

        {/* Breadcrumb */}
        {selectedTopic && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--text-subtle)" }}>›</span>
            <span style={{ color: "var(--text)", fontWeight: 500 }}>{selectedTopic.name}</span>
          </div>
        )}

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>

          {/* Agent status */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "5px 12px",
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: 99, fontSize: 12, color: "var(--primary-light)",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 0 2px rgba(16,185,129,0.25)",
              animation: "pulse 2s infinite",
              display: "inline-block",
            }} />
            Tutor Agent Online
          </div>

          {/* Back button */}
          {selectedTopic && (
            <button
              onClick={() => setSelectedTopic(null)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", fontSize: 13, fontWeight: 500,
                background: "var(--bg-card)", color: "var(--text-muted)",
                border: "1px solid var(--border)", borderRadius: 8,
                cursor: "pointer", transition: "all .15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--primary)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
              }}
            >
              ← All Topics
            </button>
          )}

          {/* Auth */}
          {isAuthenticated && user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "linear-gradient(135deg, #6366f1, #22d3ee)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#fff",
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                flexShrink: 0,
              }}>
                {user.username[0].toUpperCase()}
              </div>

              {/* Greeting */}
              <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, whiteSpace: "nowrap" }}>
                Hi, <span style={{ color: "var(--primary-light)" }}>{user.username}</span>
              </span>

              <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

              {/* Feedback */}
              <button
                onClick={() => setShowFeedback(true)}
                style={{
                  fontSize: 12, color: "var(--text-muted)",
                  padding: "5px 11px", borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)", cursor: "pointer",
                  transition: "all .15s", fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1";
                  (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
              >
                Feedback
              </button>

              {/* Dashboard */}
              <Link href="/dashboard" style={{
                fontSize: 12, color: "var(--text-muted)",
                padding: "5px 11px", borderRadius: 7,
                border: "1px solid var(--border)", textDecoration: "none",
                background: "var(--bg-card)", transition: "all .15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--primary)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)";
              }}
              >
                Dashboard
              </Link>

              {/* Sign out */}
              <button
                onClick={async () => { await logout(); router.push("/login"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 500,
                  color: "var(--text-muted)",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 7, padding: "5px 11px",
                  cursor: "pointer", transition: "all .15s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444";
                  (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/login" style={{
                padding: "5px 14px", fontSize: 13, fontWeight: 500,
                color: "var(--text-muted)", border: "1px solid var(--border)",
                borderRadius: 8, textDecoration: "none",
                background: "var(--bg-card)",
              }}>
                Sign in
              </Link>
              <Link href="/signup" style={{
                padding: "5px 14px", fontSize: 13, fontWeight: 600,
                color: "#fff", borderRadius: 8, textDecoration: "none",
                background: "var(--primary)",
              }}>
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "40px 32px", maxWidth: 1260, width: "100%", margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {selectedTopic ? (
            <motion.div
              key={selectedTopic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <TopicView topic={selectedTopic} onTopicSelect={(t: Topic) => setSelectedTopic(t)} />
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <TopicMap onSelect={(t: Topic) => setSelectedTopic(t)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ChatBot currentTopic={selectedTopic} />

      {showFeedback && (
        <FeedbackModal
          onClose={() => setShowFeedback(false)}
          topicId={selectedTopic?.id}
          topicName={selectedTopic?.name}
        />
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
