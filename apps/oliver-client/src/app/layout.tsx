import React from "react";
import "./styles/globals.css";
import { initializeAppDatabase } from "@oliver/db";

export const metadata = {
  title: "OliverAI - AI Coding Assistant for Project Management",
  description:
    "Transform your project boards into automated code workflows. OliverAI integrates with Jira, Linear, Asana, and Trello to power your development process.",
};

// Initialize database at app startup (runs once per serverless invocation)
initializeAppDatabase().catch((error) => {
  console.error("Failed to initialize database at startup:", error);
  // Continue anyway - collection layer will catch connection errors
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-950">{children}</body>
    </html>
  );
}
