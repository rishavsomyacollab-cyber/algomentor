import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoMentor — AI-Powered DSA Tutor",
  description: "Learn data structures and algorithms with an AI mentor. Visualize, quiz, and master DSA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-app-text antialiased">
        {children}
      </body>
    </html>
  );
}
