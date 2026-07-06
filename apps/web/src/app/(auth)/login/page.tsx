"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg"
               style={{ background: "var(--primary)" }}>A</div>
          <span className="text-xl font-bold" style={{ color: "var(--text)" }}>AlgoMentor</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sign in to track your progress
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border p-8"
           style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
          Welcome back
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5"
                   style={{ color: "var(--text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium"
                     style={{ color: "var(--text-muted)" }}>
                Password
              </label>
              <Link href="/forgot-password"
                    className="text-xs hover:underline"
                    style={{ color: "var(--primary-light)" }}>
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card2)",
                borderColor: "var(--border)",
                color: "var(--text)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Remember me */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <div
              onClick={() => setRememberMe(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                border: `2px solid ${rememberMe ? "var(--primary)" : "var(--border)"}`,
                background: rememberMe ? "var(--primary)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s",
              }}
            >
              {rememberMe && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Remember me</span>
          </label>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg"
               style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
            style={{ background: "var(--primary)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup"
                className="font-medium hover:underline"
                style={{ color: "var(--primary-light)" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
