"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Code2, Play } from "lucide-react";
import { Button } from "../../../components/ui/button";

export default function ApiDocsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endpoints = [
    {
      id: "list-providers",
      method: "GET",
      path: "/api/providers",
      title: "List All Available Providers",
      description:
        "Returns a list of all supported git providers with their metadata, including authentication requirements and capabilities.",
      tags: ["Providers"],
      response: {
        status: 200,
        body: {
          providers: [
            {
              id: "github",
              name: "GitHub",
              supportsOAuth: true,
              tokenPlaceholder: "ghp_xxxxxxxxxxxx",
              tokenDescription:
                "Personal Access Token (scopes: repo, admin:repo_hook)",
            },
            {
              id: "jira",
              name: "Jira Software",
              supportsOAuth: true,
              tokenPlaceholder: "domain.atlassian.net|email|api_token",
              tokenDescription: "Format: Domain | Email | API Token",
            },
          ],
        },
      },
    },
    {
      id: "authenticate",
      method: "POST",
      path: "/api/providers/{type}",
      title: "Authenticate with Provider",
      description:
        "Authenticates with a git provider using the provided token. Returns user information if successful.",
      parameters: [
        {
          name: "type",
          in: "path",
          description: "Provider type",
          required: true,
          values: ["github", "jira", "linear", "asana", "trello"],
        },
      ],
      requestBody: {
        token: "your_provider_token_here",
      },
      examples: [
        {
          label: "GitHub Example",
          command: `curl -X POST http://localhost:3000/api/providers/github \\
  -H "Content-Type: application/json" \\
  -d '{"token":"ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}'`,
        },
        {
          label: "Jira Example",
          command: `curl -X POST http://localhost:3000/api/providers/jira \\
  -H "Content-Type: application/json" \\
  -d '{"token":"domain.atlassian.net|email@company.com|api_token_here"}'`,
        },
      ],
      response: {
        status: 200,
        body: {
          success: true,
          provider: "github",
          user: {
            id: "12345",
            username: "octocat",
            name: "The Octocat",
            email: "octocat@github.com",
            avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
            profileUrl: "https://github.com/octocat",
          },
        },
      },
      errors: [
        { status: 400, message: "Missing or invalid token" },
        { status: 401, message: "Authentication failed - invalid token" },
        { status: 500, message: "Server error during authentication" },
      ],
    },
    {
      id: "get-repositories",
      method: "GET",
      path: "/api/providers/{type}/repositories",
      title: "Get Repositories for Provider",
      description:
        "Fetches a paginated list of repositories or projects from the authenticated provider.",
      parameters: [
        {
          name: "type",
          in: "path",
          description: "Provider type",
          required: true,
          values: ["github", "jira", "linear", "asana", "trello"],
        },
        {
          name: "x-provider-token",
          in: "header",
          description: "Provider authentication token",
          required: true,
        },
        {
          name: "page",
          in: "query",
          description: "Page number (default: 1)",
          required: false,
        },
        {
          name: "perPage",
          in: "query",
          description: "Items per page (default: 30, max: 100)",
          required: false,
        },
      ],
      examples: [
        {
          label: "GitHub Repositories",
          command: `curl -X GET "http://localhost:3000/api/providers/github?page=1&perPage=30" \\
  -H "x-provider-token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"`,
        },
      ],
      response: {
        status: 200,
        body: {
          repositories: [
            {
              id: "123456",
              name: "awesome-project",
              fullName: "username/awesome-project",
              description: "An awesome project",
              url: "https://github.com/username/awesome-project",
              isPrivate: false,
              language: "TypeScript",
              stars: 42,
              forks: 12,
            },
          ],
          provider: "github",
          page: 1,
          perPage: 30,
        },
      },
      errors: [
        { status: 400, message: "Missing provider token header" },
        { status: 401, message: "Invalid or expired provider token" },
        { status: 500, message: "Server error fetching repositories" },
      ],
    },
    {
      id: "solve-task",
      method: "POST",
      path: "/api/solve",
      title: "Solve Coding Task",
      description:
        "Triggers the AI agent to solve a specific coding task. Clones the repository, analyzes the task, and generates an implementation plan and diff.",
      tags: ["AI Agent"],
      requestBody: {
        task: "Fix the indentation bug in utils.ts",
        repoUrl: "https://github.com/example/repo",
        githubToken: "ghp_xxxxxxxxxxxx",
        apiKey: "sk-xxxxxxx",
      },
      response: {
        status: 200,
        body: {
          success: true,
          sessionId: "sess_987654321",
          logs: "Cloning repository...\nAnalyzing task...\nApplying fix...\n",
          diff: "--- a/src/utils.ts\n+++ b/src/utils.ts\n@@ -1,3 +1,3 @@\n-   return x\n+  return x",
          changedFiles: ["src/utils.ts"],
        },
      },
    },
    {
      id: "atlassian-installed",
      method: "POST",
      path: "/api/connect/installed",
      title: "Atlassian Connect: Installed",
      description:
        "Lifecycle callback for Atlassian Connect app installation. Stores tenant credentials for future JWT signed requests.",
      tags: ["Atlassian Connect"],
      requestBody: {
        key: "com.oliverai.jira-integration",
        clientKey: "unique-client-id",
        sharedSecret: "super-secret-string",
        baseUrl: "https://company.atlassian.net",
        productType: "jira",
      },
      response: {
        status: 200,
        body: { success: true },
      },
    },
  ];

  const testEndpoint = async (endpoint: any) => {
    const id = endpoint.id;
    const resultId = `result-${id}`;
    setTestResults((prev) => ({ ...prev, [resultId]: { loading: true } }));

    try {
      let response;
      if (endpoint.method === "GET") {
        response = await fetch(endpoint.path);
      } else if (endpoint.method === "POST") {
        response = await fetch(endpoint.path.replace("{type}", "github"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(endpoint.requestBody),
        });
      }

      const data = await response.json();
      setTestResults((prev) => ({
        ...prev,
        [resultId]: {
          loading: false,
          status: response.status,
          data,
          error: !response.ok,
        },
      }));
    } catch (error: any) {
      setTestResults((prev) => ({
        ...prev,
        [resultId]: {
          loading: false,
          error: true,
          message: error.message,
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-300 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            API Documentation
          </h1>
          <p className="text-slate-300">
            Complete reference for integrating git providers with OliverAI
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="mb-12 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            Getting Started
          </h2>
          <div className="space-y-4 text-slate-300">
            <p>
              The OliverAI API provides endpoints for managing integrations with
              git providers. All endpoints return JSON responses and use
              standard HTTP status codes.
            </p>
            <div className="bg-slate-900/50 p-4 rounded border border-slate-600">
              <p className="font-semibold text-white mb-2">Base URL:</p>
              <code className="text-green-400">http://localhost:3000</code>
            </div>
            <div className="bg-slate-900/50 p-4 rounded border border-slate-600">
              <p className="font-semibold text-white mb-2">Content-Type:</p>
              <code className="text-green-400">application/json</code>
            </div>
          </div>
        </div>

        {/* Endpoints */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Code2 size={28} />
            Endpoints
          </h2>

          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30"
            >
              {/* Endpoint Header */}
              <button
                onClick={() =>
                  setExpandedId(expandedId === endpoint.id ? null : endpoint.id)
                }
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors border-b border-slate-700"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span
                    className={`px-3 py-1 rounded font-bold text-sm ${
                      endpoint.method === "GET"
                        ? "bg-blue-900/30 text-blue-300"
                        : endpoint.method === "POST"
                          ? "bg-green-900/30 text-green-300"
                          : "bg-purple-900/30 text-purple-300"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-slate-200 font-mono text-sm">
                    {endpoint.path}
                  </code>
                </div>
                <span className="text-slate-400">
                  {expandedId === endpoint.id ? "▼" : "▶"}
                </span>
              </button>

              {/* Endpoint Details */}
              {expandedId === endpoint.id && (
                <div className="px-6 py-6 space-y-6 border-t border-slate-700">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      {endpoint.title}
                    </h3>
                    <p className="text-slate-300">{endpoint.description}</p>
                  </div>

                  {/* Parameters */}
                  {endpoint.parameters && endpoint.parameters.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">
                        Parameters
                      </h4>
                      <div className="space-y-3">
                        {endpoint.parameters.map((param, i) => (
                          <div
                            key={i}
                            className="bg-slate-900/50 p-4 rounded border border-slate-600"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-green-400 font-mono">
                                {param.name}
                              </code>
                              {param.required && (
                                <span className="text-red-400 text-sm">
                                  required
                                </span>
                              )}
                              <span className="text-slate-400 text-sm">
                                ({param.in})
                              </span>
                            </div>
                            <p className="text-slate-300 text-sm mb-2">
                              {param.description}
                            </p>
                            {param.values && (
                              <div className="text-slate-400 text-sm">
                                Values:{" "}
                                <code className="text-blue-300">
                                  {param.values.join(", ")}
                                </code>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  {endpoint.examples && endpoint.examples.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">
                        Examples
                      </h4>
                      <div className="space-y-3">
                        {endpoint.examples.map((example, i) => (
                          <div
                            key={i}
                            className="bg-slate-900/50 border border-slate-600 rounded overflow-hidden"
                          >
                            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-600 flex justify-between items-center">
                              <span className="text-slate-300 font-semibold">
                                {example.label}
                              </span>
                              <Button
                                onClick={() =>
                                  copyToClipboard(
                                    example.command,
                                    `example-${endpoint.id}-${i}`,
                                  )
                                }
                                variant="black"
                                size="sm"
                                className="gap-2"
                              >
                                {copiedId === `example-${endpoint.id}-${i}` ? (
                                  <>
                                    <Check size={16} />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy size={16} />
                                    Copy
                                  </>
                                )}
                              </Button>
                            </div>
                            <pre className="p-4 text-slate-300 font-mono text-sm overflow-x-auto">
                              <code>{example.command}</code>
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">
                      Response
                    </h4>
                    <div className="bg-slate-900/50 border border-slate-600 rounded overflow-hidden">
                      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-600">
                        <span className="text-green-400 font-semibold">
                          Status {endpoint.response.status}
                        </span>
                      </div>
                      <pre className="p-4 text-slate-300 font-mono text-sm overflow-x-auto">
                        <code>
                          {JSON.stringify(endpoint.response.body, null, 2)}
                        </code>
                      </pre>
                    </div>
                  </div>

                  {/* Errors */}
                  {endpoint.errors && endpoint.errors.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">
                        Possible Errors
                      </h4>
                      <div className="space-y-2">
                        {endpoint.errors.map((error, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-800/50 rounded"
                          >
                            <span className="text-red-400 font-semibold">
                              {error.status}
                            </span>
                            <span className="text-slate-300">
                              {error.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Test Button */}
                  <Button
                    onClick={() => testEndpoint(endpoint)}
                    variant="black"
                    size="md"
                    className="gap-2 rounded"
                  >
                    <Play size={18} />
                    Test Endpoint
                  </Button>

                  {/* Test Results */}
                  {testResults[`result-${endpoint.id}`] && (
                    <div className="mt-4 p-4 rounded bg-slate-900/50 border border-slate-600">
                      <h5 className="text-white font-semibold mb-3">
                        Test Result:
                      </h5>
                      {testResults[`result-${endpoint.id}`].loading ? (
                        <p className="text-slate-300">Testing...</p>
                      ) : testResults[`result-${endpoint.id}`].error ? (
                        <div className="text-red-400">
                          <p className="font-semibold">Error:</p>
                          <p>{testResults[`result-${endpoint.id}`].message}</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-green-400 font-semibold mb-2">
                            Status:{" "}
                            {testResults[`result-${endpoint.id}`].status}
                          </p>
                          <pre className="bg-slate-800 p-3 rounded text-slate-300 font-mono text-sm overflow-x-auto">
                            <code>
                              {JSON.stringify(
                                testResults[`result-${endpoint.id}`].data,
                                null,
                                2,
                              )}
                            </code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Token Instructions */}
        <div className="mt-12 p-6 rounded-lg bg-blue-900/20 border border-blue-800/50">
          <h2 className="text-2xl font-bold text-white mb-4">
            How to Get Provider Tokens
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                GitHub Personal Access Token
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>Go to https://github.com/settings/tokens</li>
                <li>
                  Click "Generate new token" → "Generate new token (classic)"
                </li>
                <li>
                  Select scopes:{" "}
                  <code className="bg-slate-800 px-2 py-1 rounded">repo</code>,{" "}
                  <code className="bg-slate-800 px-2 py-1 rounded">
                    admin:repo_hook
                  </code>
                </li>
                <li>Copy the token and use it in API calls</li>
              </ol>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-blue-300 mb-2">
                Jira API Token
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-300">
                <li>
                  Go to
                  https://id.atlassian.com/manage-profile/security/api-tokens
                </li>
                <li>Click "Create API token"</li>
                <li>Copy the token</li>
                <li>
                  Format:{" "}
                  <code className="bg-slate-800 px-2 py-1 rounded">
                    domain.atlassian.net|email@company.com|api_token
                  </code>
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* OpenAPI Spec */}
        <div className="mt-12 p-6 rounded-lg bg-slate-800/50 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">
            OpenAPI Specification
          </h2>
          <p className="text-slate-300 mb-4">
            Download the complete OpenAPI specification for use with tools like
            Postman, Swagger UI, or API clients.
          </p>
          <a
            href="/openapi.json"
            download
            className="inline-flex items-center gap-2 px-6 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors"
          >
            <Code2 size={18} />
            Download OpenAPI Spec (JSON)
          </a>
        </div>
      </div>
    </div>
  );
}
