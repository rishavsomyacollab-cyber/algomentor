"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();

  // Redirect authenticated users away from login/signup (not from password-reset pages)
  useEffect(() => {
    if (!isLoading && isAuthenticated && (pathname === "/login" || pathname === "/signup")) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: "var(--bg)" }}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: 700, height: 700, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,.16) 0%, transparent 65%)",
          filter: "blur(20px)",
        }} />
        <div style={{
          position: "absolute", bottom: "-15%", right: "-10%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,211,238,.12) 0%, transparent 65%)",
          filter: "blur(20px)",
        }} />
      </div>
      <div className="relative z-10 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
