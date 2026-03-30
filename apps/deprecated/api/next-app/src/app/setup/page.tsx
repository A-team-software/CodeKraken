"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GitConnectStep } from "../../../components/setup/GitConnectStep";
import { RepoPickerStep } from "../../../components/setup/RepoPickerStep";
import { SiteAssignStep } from "../../../components/setup/SiteAssignStep";
import { Button } from "../../../components/ui/button";
import { UnifiedRepository } from "@/lib/git";

function SetupWizardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // "connect" | "repos" | "assign"
  const initialStep =
    (searchParams.get("step") as "connect" | "repos" | "assign") || "connect";
  const initialProvider = searchParams.get("provider") as
    | "github"
    | "bitbucket"
    | null;

  const [step, setStep] = useState<"connect" | "repos" | "assign">(initialStep);
  const [provider, setProvider] = useState<"github" | "bitbucket" | null>(
    initialProvider,
  );
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectedReposData, setSelectedReposData] = useState<
    UnifiedRepository[]
  >([]);

  useEffect(() => {
    if (initialStep) setStep(initialStep);
    if (initialProvider) setProvider(initialProvider);
  }, [initialStep, initialProvider]);

  const handleConnect = async (selectedProvider: "github" | "bitbucket") => {
    try {
      // Fetch the OAuth login URL from the API
      const response = await fetch(`/api/git/${selectedProvider}/oauth`);

      if (!response.ok) {
        const text = await response.text();
        const error = text
          ? (() => {
              try {
                return JSON.parse(text);
              } catch {
                return { error: text };
              }
            })()
          : { error: `HTTP ${response.status}` };
        console.error("Failed to initiate OAuth:", error);
        alert(`Failed to connect to ${selectedProvider}. Please try again.`);
        return;
      }

      const data = await response.json();

      // Before pushing them to OAuth, update their onboarding step so when they come back, they are on step 2
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "repos" }),
      });

      // Redirect to the OAuth login URL
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      } else {
        console.error("No login URL provided in response");
        alert(`Failed to get OAuth login URL from ${selectedProvider}`);
      }
    } catch (error) {
      console.error("Error initiating OAuth flow:", error);
      alert(
        "An error occurred while connecting to the provider. Please try again.",
      );
    }
  };

  const handleReposSelected = async (
    newSelectionIds: Set<string>,
    allFetchedRepos: UnifiedRepository[],
  ) => {
    setSelectedRepoIds(newSelectionIds);
    // Keep full objects around for the POST request in the next step
    const fullObjects = allFetchedRepos.filter((r) =>
      newSelectionIds.has(r.id),
    );
    setSelectedReposData(fullObjects);
  };

  const advanceToAssign = async () => {
    try {
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "assign" }),
      });
    } catch (e) {
      console.error(e);
    }
    setStep("assign");
  };

  const completeSetup = async () => {
    try {
      await fetch("/api/user/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "completed" }),
      });
    } catch (e) {
      console.error(e);
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white selection:bg-blue-500/30 font-sans flex flex-col">
      <header className="bg-transparent pt-6 hidden md:block">
        <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
              <span className="font-bold text-lg text-white">O</span>
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              OliverAI Setup
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 flex flex-col">
        {/* Stepper Wizard Indicator */}
        <div className="w-full max-w-3xl mx-auto mb-16 px-4">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 -z-10 rounded-full"></div>

            <div
              className={`w-1/2 absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 -z-10 transition-all duration-500 rounded-full ${
                step === "connect"
                  ? "scale-x-0 origin-left"
                  : step === "repos"
                    ? "scale-x-100 origin-left w-1/2"
                    : "scale-x-100 origin-left w-full"
              }`}
            ></div>

            {[
              { id: "connect", label: "1. Connect Git" },
              { id: "repos", label: "2. Select Repos" },
              { id: "assign", label: "3. Assign to Jira" },
            ].map((s, idx) => {
              const isPast =
                (step === "repos" && idx === 0) ||
                (step === "assign" && idx < 2);
              const isCurrent = step === s.id;

              return (
                <div
                  key={s.id}
                  className="flex flex-col items-center gap-3 bg-slate-950 px-2 lg:px-4"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                      isCurrent
                        ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                        : isPast
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {isPast ? "✓" : idx + 1}
                  </div>
                  <span
                    className={`text-sm font-medium ${isCurrent ? "text-white" : isPast ? "text-blue-200" : "text-slate-500"}`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 flex flex-col items-center w-full">
          {step === "connect" && <GitConnectStep onConnect={handleConnect} />}

          {step === "repos" && provider && (
            <RepoPickerStep
              provider={provider}
              selectedRepos={selectedRepoIds}
              onSelectionChange={handleReposSelected}
              onNext={advanceToAssign}
            />
          )}

          {step === "assign" && provider && (
            <SiteAssignStep
              provider={provider}
              selectedReposData={selectedReposData}
              onFinish={completeSetup}
            />
          )}

          {(step === "repos" || step === "assign") && !provider && (
            <div className="text-center p-8 bg-red-900/20 text-red-400 border border-red-900/50 rounded-xl">
              Provider not found. Please restart from Step 1.
              <br />
              <br />
              <Button onClick={() => setStep("connect")} variant="white">
                Restart Setup
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SetupWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center">
          <div className="animate-pulse">Loading setup...</div>
        </div>
      }
    >
      <SetupWizardContent />
    </Suspense>
  );
}
