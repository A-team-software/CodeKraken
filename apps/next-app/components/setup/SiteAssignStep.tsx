import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Loader2, Server, CheckCircle2 } from "lucide-react";
import { UnifiedRepository } from "@/lib/git/domain/types";

interface SiteAssignStepProps {
  provider: "github" | "bitbucket";
  selectedReposData: UnifiedRepository[];
  onFinish: () => void;
}

interface JiraSite {
  clientKey: string;
  baseUrl: string;
  productType: string;
  description?: string;
  key?: string;
}

export function SiteAssignStep({
  provider,
  selectedReposData,
  onFinish,
}: SiteAssignStepProps) {
  const [sites, setSites] = useState<JiraSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSiteKey, setSelectedSiteKey] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [needsJiraAuth, setNeedsJiraAuth] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    async function fetchSites() {
      try {
        setLoading(true);
        setNeedsJiraAuth(false);
        const res = await fetch("/api/sites");

        if (res.status === 401) {
          setNeedsJiraAuth(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to load Jira sites");
        }

        const data = await res.json();
        setSites(data.sites || []);
      } catch (err: any) {
        setError(err.message || "Error loading sites");
      } finally {
        if (!needsJiraAuth) {
          setLoading(false);
        }
      }
    }
    fetchSites();
  }, []);

  const handleJiraAuth = async () => {
    try {
      setAuthLoading(true);
      const response = await fetch("/api/boards/jira/oauth");

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to initiate Jira OAuth:", error);
        throw new Error("Failed to initiate Jira authentication");
      }

      const data = await response.json();

      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      } else {
        throw new Error("No Jira login URL provided");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Jira");
      setAuthLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSiteKey) {
      setError("Please select a Jira site");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const site = sites.find((s) => s.clientKey === selectedSiteKey);
      if (!site) throw new Error("Site not found");

      // Assign all selected repos to the chosen site one by one
      for (const repo of selectedReposData) {
        const payload = {
          repoId: repo.id,
          repoFullName: repo.fullName,
          provider: provider,
          htmlUrl: repo.htmlUrl,
        };

        const res = await fetch(`/api/sites/${site.clientKey}/repositories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errStr = await res.text();
          throw new Error(`Failed to assign ${repo.fullName}: ${errStr}`);
        }
      }

      setSuccess(true);
      setTimeout(onFinish, 2000); // Redirect after short delay
    } catch (err: any) {
      setError(err.message || "Error saving assignments");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>Loading your Jira sites...</p>
      </div>
    );
  }

  if (needsJiraAuth) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-3">
            Step 3: Assign to Jira
          </h2>
          <p className="text-white/60 text-lg">
            Connect your Jira account to assign repositories
          </p>
        </div>

        {error && (
          <div className="bg-red-900/40 text-red-200 border border-red-500/50 rounded-2xl p-4 text-center backdrop-blur-md">
            {error}
          </div>
        )}

        <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-white/10 text-white/50 backdrop-blur-md space-y-6">
          <div className="text-center space-y-3">
            <p className="font-semibold text-white text-lg">
              Jira Authentication Required
            </p>
            <p>
              You must authenticate with Jira to fetch your sites and complete
              the setup.
            </p>
          </div>

          <Button
            onClick={handleJiraAuth}
            disabled={authLoading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
          >
            {authLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Redirecting to Jira...
              </span>
            ) : (
              "Connect Jira Account"
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-green-400">
        <CheckCircle2 className="w-16 h-16 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          Assignments Saved!
        </h2>
        <p>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          Choose your workplace
        </h2>
        <p className="text-white/40 text-xl font-medium">
          Select the Jira site where you want to deploy your agentic workflows.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/40 text-red-200 border border-red-500/50 rounded-2xl p-4 text-center backdrop-blur-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {sites.map((site) => (
          <div
            key={site.clientKey}
            onClick={() => setSelectedSiteKey(site.clientKey)}
            className={`p-8 rounded-[2rem] border-2 cursor-pointer transition-all duration-300 flex items-center gap-6 group ${
              selectedSiteKey === site.clientKey
                ? "bg-white border-white shadow-[0_20px_50px_rgba(255,255,255,0.15)] scale-[1.02]"
                : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10"
            }`}
          >
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                selectedSiteKey === site.clientKey
                  ? "bg-black text-white rotate-3"
                  : "bg-white/10 text-white/40 group-hover:rotate-3"
              }`}
            >
              <Server className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3
                className={`font-bold text-2xl transition-colors duration-300 ${
                  selectedSiteKey === site.clientKey
                    ? "text-black"
                    : "text-white"
                }`}
              >
                {site.key || "Jira Software"}
              </h3>
              <p
                className={`font-mono text-sm mt-1 transition-colors duration-300 ${
                  selectedSiteKey === site.clientKey
                    ? "text-black/60"
                    : "text-white/40"
                }`}
              >
                {site.baseUrl.replace("https://", "")}
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                selectedSiteKey === site.clientKey
                  ? "border-black/20 bg-black/5"
                  : "border-white/20"
              }`}
            >
              {selectedSiteKey === site.clientKey && (
                <div className="w-4 h-4 rounded-full bg-black animate-in zoom-in duration-300" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4">
        <Button
          onClick={handleSave}
          disabled={!selectedSiteKey || saving || sites.length === 0}
          className="w-full h-20 text-2xl font-black rounded-[2rem] bg-white text-black hover:bg-gray-200 transition-all hover:scale-[1.02] shadow-2xl active:scale-[0.98] disabled:opacity-30 disabled:hover:scale-100"
        >
          {saving ? (
            <span className="flex items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin" /> Finalizing...
            </span>
          ) : (
            "Select Workplace"
          )}
        </Button>
      </div>
    </div>
  );
}
