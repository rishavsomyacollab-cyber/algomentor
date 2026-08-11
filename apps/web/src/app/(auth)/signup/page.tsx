"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import AuthHeader from "@/components/AuthHeader";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuthStore((s) => s.signup);

  const [email, setEmail]       = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup(email, username, password);
      router.push("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <AuthHeader subtitle="Create an account to start learning" />

      {/* Card */}
      <div className="rounded-2xl border p-8 animate-slide-up"
           style={{
             background: "linear-gradient(180deg, rgba(17,24,39,.9), rgba(13,17,23,.9))",
             backdropFilter: "blur(12px)",
             borderColor: "var(--border)",
             boxShadow: "var(--shadow-card)",
           }}>
        <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text)" }}>
          Create account
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
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border)", color: "var(--text)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5"
                   style={{ color: "var(--text-muted)" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="algolover42"
              required
              minLength={3}
              maxLength={30}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border)", color: "var(--text)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5"
                   style={{ color: "var(--text-muted)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border)", color: "var(--text)" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg"
               style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full py-2.5 text-sm font-semibold"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Already have an account?{" "}
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
