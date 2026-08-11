"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthHeader from "@/components/AuthHeader";

type Step = "form" | "sent";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [step, setStep]       = useState<Step>("form");
  const [devUrl, setDevUrl]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setDevUrl(res.dev_reset_url ?? "");
      setStep("sent");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <AuthHeader subtitle="Reset your password" />

      <div className="rounded-2xl border p-8 animate-slide-up"
           style={{
             background: "linear-gradient(180deg, rgba(17,24,39,.9), rgba(13,17,23,.9))",
             backdropFilter: "blur(12px)",
             borderColor: "var(--border)",
             boxShadow: "var(--shadow-card)",
           }}>

        {step === "form" ? (
          <>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
              Forgot password?
            </h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5"
                       style={{ color: "var(--text-muted)" }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{
                    background: "var(--bg-card2)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                  onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)"; }}
                  onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg"
                   style={{ background: "rgba(239,68,68,.1)", color: "var(--danger)" }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5 text-sm font-semibold"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center mb-6">
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: "rgba(16,185,129,.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 24,
              }}>✉️</div>
              <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>
                Check your email
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                If <strong style={{ color: "var(--text)" }}>{email}</strong> is registered,
                a reset link has been sent.
              </p>
            </div>

            {/* Dev-mode reset link */}
            {devUrl && (
              <div className="rounded-lg p-4 mb-4" style={{
                background: "rgba(245,158,11,.08)",
                border: "1px solid rgba(245,158,11,.2)",
              }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "#f59e0b" }}>
                  Dev mode — no email configured
                </p>
                <Link
                  href={devUrl}
                  className="text-xs break-all hover:underline"
                  style={{ color: "var(--primary-light)" }}
                >
                  {devUrl}
                </Link>
              </div>
            )}

            <button
              onClick={() => { setStep("form"); setEmail(""); setDevUrl(""); }}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
              style={{
                background: "var(--bg-card2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              Send to a different email
            </button>
          </>
        )}

        <p className="mt-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Remember it?{" "}
          <Link href="/login"
                className="font-medium hover:underline"
                style={{ color: "var(--primary-light)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
