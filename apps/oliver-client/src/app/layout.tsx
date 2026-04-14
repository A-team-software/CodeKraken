import React from "react";
import "./styles/globals.css";

export const metadata = {
  title: "OliverAI - AI Coding Assistant for Project Management",
  description:
    "Transform your project boards into automated code workflows. OliverAI integrates with Jira, Linear, Asana, and Trello to power your development process.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-slate-950">{children}</body>
    </html>
  );
}
