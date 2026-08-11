export default function AuthHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="text-center mb-8 animate-fade-in">
      <div className="inline-flex items-center gap-2.5 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--cyan))",
            boxShadow: "0 4px 20px rgba(99,102,241,.45)",
          }}
        >
          A
        </div>
        <span
          className="text-2xl font-extrabold tracking-tight"
          style={{
            background: "linear-gradient(135deg, #e2e8f0 0%, #818cf8 60%, #22d3ee 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          AlgoMentor
        </span>
      </div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </p>
    </div>
  );
}
