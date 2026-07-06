"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";

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
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-lg"
               style={{ background: "var(--primary)" }}>A</div>
          <span className="text-xl font-bold" style={{ color: "var(--text)" }}>AlgoMentor</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Create an account to start learning
        </p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border p-8"
           style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
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
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border)", color: "var(--text)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
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
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border)", color: "var(--text)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
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
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{ background: "var(--bg-card2)", borderColor: "var(--border)", color: "var(--text)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
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
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
            style={{ background: "var(--primary)", opacity: loading ? 0.7 : 1 }}
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
