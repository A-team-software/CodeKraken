"use client";

import React from "react";
import { ArrowLeft, Code2, GitBranch, Zap } from "lucide-react";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative">
        {/* Header */}
        <div className="border-b border-slate-800 py-6 px-6">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded-lg transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Documentation</h1>
          </div>
        </div>

        {/* Content */}
        <div className="py-12 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Getting Started */}
            <section className="space-y-4">
              <h2 className="text-3xl font-bold flex items-center gap-2 mb-6">
                <Zap className="w-6 h-6 text-blue-400" />
                Getting Started
              </h2>
              <div className="glass rounded-lg p-6 border border-slate-700/50 space-y-4">
                <p className="text-slate-300">
                  Follow these steps to get OliverAI set up in minutes:
                </p>
                <ol className="space-y-3 list-decimal list-inside text-slate-300">
                  <li>Sign up for an OliverAI account</li>
                  <li>
                    Connect your project management tool (Jira, Linear, Asana,
                    or Trello)
                  </li>
                  <li>Create a new project and select your requirements</li>
                  <li>Let OliverAI generate your code</li>
                  <li>Review, adjust, and merge your PR</li>
                </ol>
              </div>
            </section>

            {/* Integration Guides */}
            <section className="space-y-4">
              <h2 className="text-3xl font-bold flex items-center gap-2 mb-6">
                <GitBranch className="w-6 h-6 text-purple-400" />
                Platform Integrations
              </h2>
              <div className="space-y-4">
                {integrations.map((integration, index) => (
                  <div
                    key={index}
                    className="glass rounded-lg p-6 border border-slate-700/50"
                  >
                    <h3 className="text-xl font-semibold mb-3">
                      {integration.name}
                    </h3>
                    <p className="text-slate-300 mb-4">
                      {integration.description}
                    </p>
                    <div className="bg-slate-800/50 p-4 rounded font-mono text-sm text-slate-300 overflow-x-auto">
                      <pre>{integration.example}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* API Reference */}
            <section className="space-y-4">
              <h2 className="text-3xl font-bold flex items-center gap-2 mb-6">
                <Code2 className="w-6 h-6 text-pink-400" />
                API Reference
              </h2>
              <div className="glass rounded-lg p-6 border border-slate-700/50 space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-400 mb-2">
                    POST /api/solve
                  </h4>
                  <p className="text-slate-300">
                    Solve a coding task autonomously using the AI agent
                  </p>
                  <div className="bg-slate-800/50 p-4 rounded font-mono text-sm text-slate-300 mt-2 overflow-x-auto">
                    <pre>{`{
  "task": "Create user authentication module",
  "repoUrl": "https://github.com/org/repo",
  "apiKey": "sk-xxxxxxx"
}`}</pre>
                  </div>
                </div>
              </div>
            </section>

            {/* Best Practices */}
            <section className="space-y-4">
              <h2 className="text-3xl font-bold mb-6">Best Practices</h2>
              <div className="space-y-3 text-slate-300">
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <p className="font-semibold text-blue-300 mb-1">
                    ✨ Write Clear Requirements
                  </p>
                  <p className="text-slate-400">
                    The better your requirements, the better the code generation
                  </p>
                </div>
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <p className="font-semibold text-blue-300 mb-1">
                    🔍 Review Generated Code
                  </p>
                  <p className="text-slate-400">
                    Always review generated code before merging to your main
                    branch
                  </p>
                </div>
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <p className="font-semibold text-blue-300 mb-1">
                    📝 Maintain Code Standards
                  </p>
                  <p className="text-slate-400">
                    Use .oliverairc to enforce your project's coding standards
                  </p>
                </div>
                <div className="glass rounded-lg p-4 border border-slate-700/50">
                  <p className="font-semibold text-blue-300 mb-1">
                    🔄 Iterative Refinement
                  </p>
                  <p className="text-slate-400">
                    Request modifications from OliverAI to perfect the output
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

const integrations = [
  {
    name: "Jira Integration",
    description:
      "Connect to your Jira instance and automate epic and feature development",
    example: `# Install Jira integration
oliver integrate jira \\
  --domain https://company.atlassian.net \\
  --api-token YOUR_TOKEN

# Generate from issue
oliver generate --jira-issue PROJ-123`,
  },
  {
    name: "Linear Integration",
    description: "Seamlessly work with Linear issues and pull requests",
    example: `# Setup Linear
oliver integrate linear \\
  --api-key YOUR_API_KEY

# Generate from issue
oliver generate --linear-issue LIN-456`,
  },
  {
    name: "GitHub Integration",
    description: "Automatically create branches and pull requests on GitHub",
    example: `# Setup GitHub
oliver integrate github \\
  --token YOUR_GITHUB_TOKEN \\
  --repo owner/repo

# Push generated code
oliver push --create-pr --auto-assign`,
  },
];
