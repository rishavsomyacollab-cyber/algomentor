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
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: "var(--bg)" }}>
      {children}
    </div>
  );
}
