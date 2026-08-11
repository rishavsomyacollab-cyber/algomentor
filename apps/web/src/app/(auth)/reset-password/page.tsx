"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import AuthHeader from "@/components/AuthHeader";

type Step = "form" | "done" | "invalid";

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [step, setStep]           = useState<Step>(token ? "form" : "invalid");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPw, setShowPw]       = useState(false);

  useEffect(() => {
    if (!token) setStep("invalid");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setError("");
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed — the link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "invalid") return (
    <div className="text-center">
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Invalid link</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        This reset link is missing or invalid.
      </p>
      <Link href="/forgot-password"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--primary-light)" }}>
        Request a new link
      </Link>
    </div>
  );

  if (step === "done") return (
    <div className="text-center">
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        background: "rgba(16,185,129,.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px", fontSize: 24,
      }}>✅</div>
      <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text)" }}>Password updated!</h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Your password has been changed. You can now sign in.
      </p>
      <button
        onClick={() => router.push("/login")}
        className="btn btn-primary w-full py-2.5 text-sm font-semibold"
      >
        Go to sign in
      </button>
    </div>
  );

  return (
    <>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text)" }}>
        Set new password
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5"
                 style={{ color: "var(--text-muted)" }}>
            New password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
              style={{
                background: "var(--bg-card2)",
                borderColor: "var(--border)",
                color: "var(--text)",
                paddingRight: 44,
              }}
              onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)"; }}
              onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 14, color: "var(--text-muted)",
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* Strength bar */}
          {password.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 4 }}>
              {[1, 2, 3].map(i => {
                const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : 1;
                const colors   = ["#ef4444", "#f59e0b", "#10b981"];
                return (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 99,
                    background: i <= strength ? colors[strength - 1] : "#1e2535",
                    transition: "background .2s",
                  }} />
                );
              })}
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>
                {password.length >= 12 ? "Strong" : password.length >= 8 ? "Good" : "Weak"}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5"
                 style={{ color: "var(--text-muted)" }}>
            Confirm password
          </label>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            required
            className="w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors"
            style={{
              background: "var(--bg-card2)",
              borderColor: confirm && confirm !== password ? "#ef4444" : "var(--border)",
              color: "var(--text)",
            }}
            onFocus={e => { e.target.style.borderColor = "var(--primary)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,.15)"; }}
            onBlur={e  => {
              e.target.style.borderColor = confirm && confirm !== password ? "#ef4444" : "var(--border)";
              e.target.style.boxShadow = "none";
            }}
          />
          {confirm && confirm !== password && (
            <p className="text-xs mt-1" style={{ color: "#ef4444" }}>Passwords do not match</p>
          )}
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg"
             style={{ background: "rgba(239,68,68,.1)", color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || (!!confirm && confirm !== password)}
          className="btn btn-primary w-full py-2.5 text-sm font-semibold"
          style={{ opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <AuthHeader subtitle="Choose a new password" />

      <div className="rounded-2xl border p-8 animate-slide-up"
           style={{
             background: "linear-gradient(180deg, rgba(17,24,39,.9), rgba(13,17,23,.9))",
             backdropFilter: "blur(12px)",
             borderColor: "var(--border)",
             boxShadow: "var(--shadow-card)",
           }}>
        <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
          <Link href="/login"
                className="font-medium hover:underline"
                style={{ color: "var(--primary-light)" }}>
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
