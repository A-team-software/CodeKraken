"use client";

import React from "react";
import { useEnvironment } from "@/context/EnvironmentContext";
import { Button } from "../../../../../components/ui/button";
import { Code, GitBranch, Zap } from "lucide-react";

export default function JiraIssuePanelPage() {
  const { context, isLoading } = useEnvironment();
  const [analysis, setAnalysis] = React.useState<any>(null);
  const [analyzing, setAnalyzing] = React.useState(false);

  React.useEffect(() => {
    if (context?.jira?.issue?.key) {
      fetchAnalysis(context.jira.issue);
    }
  }, [context]);

  const fetchAnalysis = async (issue: any) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueKey: issue.key,
          summary: issue.summary,
          description: issue.description,
        }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error("Failed to analyze", e);
    } finally {
      setAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-transparent">
        <div className="text-sm text-gray-600">Loading context...</div>
      </div>
    );
  }

  const issueKey = context?.jira?.issue?.key || "UNKNOWN-123";
  const issueSummary =
    context?.jira?.issue?.summary || "Implement Plugin Feature";

  return (
    <div className="p-4 min-h-screen bg-white">
      <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-3 p-4 border-b border-gray-200">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Code className="text-gray-900" size={24} />
          </div>
          <div className="flex flex-col">
            <p className="text-md font-bold text-gray-900">OliverAI Helper</p>
            <p className="text-sm text-gray-600">Context: {issueKey}</p>
          </div>
        </div>
        <div className="p-4">
          <p className="mb-4 text-gray-700">
            Analyzing <strong>{issueKey}</strong>: "{issueSummary}"
          </p>

          {analyzing ? (
            <div className="py-4 flex justify-center text-sm text-gray-600">
              Analyzing complexity...
            </div>
          ) : analysis ? (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-semibold text-gray-900">Analysis Complete</p>
              <p>Complexity: {analysis.complexity}</p>
              <p>Est. Time: {analysis.estimatedTime}</p>
              <p className="mt-2 text-xs text-gray-600">{analysis.summary}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button type="button" variant="black" className="justify-center">
              <span className="inline-flex items-center gap-2">
                <Zap size={18} />
                Draft Solution
              </span>
            </Button>
            <Button type="button" variant="white" className="justify-center">
              <span className="inline-flex items-center gap-2">
                <GitBranch size={18} />
                Create Feature Branch
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
