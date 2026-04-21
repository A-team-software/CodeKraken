"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { GitProviderFactory } from "@oliver/git";
import { Button } from "../../../components/ui/button";

export default function IntegrationsPage() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"token" | "oauth">("token");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const providers = GitProviderFactory.getAllProviders();

  // Check for OAuth callback errors in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const provider = params.get("provider");

    if (error) {
      setStatus({
        type: "error",
        message: `OAuth failed for ${provider}: ${error}`,
      });
      // Clean up URL
      window.history.replaceState({}, "", "/integrations");
    }
  }, []);

  const handleAuthenticate = async () => {
    if (!selectedProvider || !token) {
      setStatus({
        type: "error",
        message: "Please select a provider and enter a token",
      });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch(`/api/providers/${selectedProvider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Authentication failed");
      }

      const data = await response.json();
      setStatus({
        type: "success",
        message: `Connected with ${data.user.username}`,
      });
      setToken("");

      // Store provider info (in real app, save to backend)
      localStorage.setItem(
        `provider_${selectedProvider}`,
        JSON.stringify({
          token,
          user: data.user,
          connectedAt: new Date().toISOString(),
        }),
      );
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "Authorization failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const GIT_PROVIDERS = new Set(["github", "bitbucket"]);
  const BOARD_PROVIDERS = new Set(["trello", "asana", "linear"]);

  const handleOAuthClick = async () => {
    if (!selectedProvider) {
      setStatus({
        type: "error",
        message: "Please select a provider",
      });
      return;
    }

    setOauthLoading(true);
    setStatus(null);

    try {
      let oauthPath: string;
      if (GIT_PROVIDERS.has(selectedProvider)) {
        oauthPath = `/api/git/${selectedProvider}/oauth`;
      } else if (BOARD_PROVIDERS.has(selectedProvider)) {
        oauthPath = `/api/boards/${selectedProvider}/oauth`;
      } else {
        throw new Error(
          `No OAuth flow available for provider: ${selectedProvider}`,
        );
      }

      const response = await fetch(oauthPath);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate OAuth");
      }

      const data = await response.json();

      // Redirect to OAuth provider
      window.location.href = data.loginUrl;
    } catch (error: any) {
      setStatus({
        type: "error",
        message: error.message || "OAuth initiation failed",
      });
      setOauthLoading(false);
    }
  };

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
        <div className="border-b border-slate-800 py-6 px-6 sticky top-0 z-40 glass">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-slate-800 rounded-lg transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">Integrations</h1>
          </div>
        </div>

        {/* Content */}
        <div className="py-12 px-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Connect Your Services</h2>
              <p className="text-slate-300">
                Connect your project management and Git hosting services to
                enable automated code generation. Choose between direct token
                authentication or OAuth.
              </p>
            </div>

            {/* Status Message */}
            {status && (
              <div
                className={`glass rounded-lg p-4 border ${
                  status.type === "success"
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-red-500/50 bg-red-500/10"
                } flex items-start gap-3`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p
                  className={
                    status.type === "success"
                      ? "text-green-300"
                      : "text-red-300"
                  }
                >
                  {status.message}
                </p>
              </div>
            )}

            {/* Provider Selection */}
            <div className="space-y-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => {
                    setSelectedProvider(provider.id);
                    setStatus(null);
                  }}
                  className={`w-full glass rounded-lg p-4 border transition-smooth text-left flex items-center gap-3 ${
                    selectedProvider === provider.id
                      ? "border-black/50 bg-black/10"
                      : "border-slate-700/50 hover:border-slate-600/50"
                  }`}
                >
                  <provider.icon className="w-6 h-6" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{provider.name}</h3>
                    <p className="text-xs text-slate-400">
                      OAuth & Token Authentication Available
                    </p>
                  </div>
                  {selectedProvider === provider.id && (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  )}
                </button>
              ))}
            </div>

            {/* Authentication Method Selection */}
            {selectedProvider && (
              <div className="space-y-4">
                <div className="flex gap-3 border border-slate-700/50 rounded-lg p-1 glass">
                  <button
                    onClick={() => setAuthMethod("oauth")}
                    className={`flex-1 px-4 py-2 rounded-md transition-smooth font-medium ${
                      authMethod === "oauth"
                        ? "bg-black text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    OAuth (Recommended)
                  </button>
                  <button
                    onClick={() => setAuthMethod("token")}
                    className={`flex-1 px-4 py-2 rounded-md transition-smooth font-medium ${
                      authMethod === "token"
                        ? "bg-black text-white"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Token
                  </button>
                </div>

                {/* OAuth Option */}
                {authMethod === "oauth" && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      Click below to authenticate via{" "}
                      {GitProviderFactory.getMetadata(selectedProvider)?.name}.
                      You'll be securely redirected to authorize access.
                    </p>
                    <Button
                      onClick={handleOAuthClick}
                      disabled={oauthLoading}
                      variant="black"
                      size="md"
                      className="w-full rounded-lg gap-2"
                    >
                      {oauthLoading ? (
                        <>
                          <div className="animate-spin rounded-full w-4 h-4 border-2 border-white/30 border-t-white"></div>
                          Redirecting...
                        </>
                      ) : (
                        <>
                          {selectedProvider === "github" && (
                            <Github className="w-5 h-5" />
                          )}
                          Authenticate with{" "}
                          {
                            GitProviderFactory.getMetadata(selectedProvider)
                              ?.name
                          }
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Token Option */}
                {authMethod === "token" && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-300 mb-2 block">
                        {
                          GitProviderFactory.getMetadata(selectedProvider)
                            ?.tokenDescription
                        }
                      </span>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder={
                          GitProviderFactory.getMetadata(selectedProvider)
                            ?.tokenPlaceholder
                        }
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                      />
                    </label>

                    <Button
                      onClick={handleAuthenticate}
                      disabled={loading || !token}
                      variant="black"
                      size="md"
                      className="w-full rounded-lg"
                    >
                      {loading ? "Authenticating..." : "Connect"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Info */}
            <div className="glass rounded-lg p-6 border border-slate-700/50 space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Authentication Methods
                </h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li>
                    <strong>OAuth (Recommended):</strong> Securely authenticate
                    without sharing tokens. Ideal for production environments.
                  </li>
                  <li>
                    <strong>Personal Access Token:</strong> Create a token for
                    direct authentication. Useful for development and
                    automation.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Get Your Token</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>
                    <strong>GitHub:</strong> Create a Personal Access Token at{" "}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      github.com/settings/tokens
                    </a>
                  </li>
                  <li>
                    <strong>Jira:</strong> Create an API Token at{" "}
                    <a
                      href="https://id.atlassian.com/manage-profile/security/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      Atlassian Account
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
