import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Search, Loader2 } from "lucide-react";
import { UnifiedRepository } from "@oliver/core";

interface RepoPickerStepProps {
  provider: "github" | "bitbucket";
  selectedRepos: Set<string>;
  onSelectionChange: (
    selectedRepos: Set<string>,
    allFetchedRepos: UnifiedRepository[],
  ) => void;
  onNext: () => void;
}

export function RepoPickerStep({
  provider,
  selectedRepos,
  onSelectionChange,
  onNext,
}: RepoPickerStepProps) {
  const [repos, setRepos] = useState<UnifiedRepository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadRepos() {
      try {
        setLoading(true);
        const res = await fetch(`/api/git/${provider}/repositories`);
        if (!res.ok) {
          throw new Error("Failed to load repositories. Please reconnect.");
        }
        const data = await res.json();
        setRepos(data.repositories || []);
      } catch (err: any) {
        setError(
          err.message || "An error occurred while loading repositories.",
        );
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, [provider]);

  const toggleRepo = (repoId: string) => {
    const newSelection = new Set(selectedRepos);
    if (newSelection.has(repoId)) {
      newSelection.delete(repoId);
    } else {
      newSelection.add(repoId);
    }
    // Pass the full repo list so the parent can find the repo objects
    onSelectionChange(newSelection, repos);
  };

  const filteredRepos = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p>Fetching your {provider} repositories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-xl text-center">
        <div className="text-red-400 mb-4">{error}</div>
        <Button
          variant="white"
          onClick={() => (window.location.href = `/api/git/${provider}/oauth`)}
        >
          Reconnect {provider}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col">
      {/* Sticky Header with Title, Counter, and Next Button */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-gray-900 via-black to-black/95 backdrop-blur-md border-b border-white/10 px-6 py-5 rounded-t-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Select Repositories
            </h2>
            <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap">
              {selectedRepos.size} selected
            </span>
          </div>
          <Button
            onClick={onNext}
            disabled={selectedRepos.size === 0}
            className="w-full sm:w-auto px-8 py-3 text-lg font-bold rounded-xl bg-white text-black hover:bg-gray-200 transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-white disabled:cursor-not-allowed"
          >
            Next Step →
          </Button>
        </div>
      </div>

      {/* Search and Repo List Container */}
      <div className="space-y-4">
        <div className="relative group px-6 pt-6">
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 group-focus-within:text-white transition-colors" />
          <input
            type="text"
            placeholder="Search repositories..."
            className="w-full bg-white/5 backdrop-blur-md border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all shadow-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="px-6 pb-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredRepos.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No repositories found matching your search.
                </div>
              ) : (
                <ul className="">
                  {filteredRepos.map((repo) => (
                    <li
                      key={repo.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-0"
                      onClick={() => toggleRepo(repo.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            selectedRepos.has(repo.id)
                              ? "bg-white border-white"
                              : "border-white/30 group-hover:border-white/50"
                          }`}
                        >
                          {selectedRepos.has(repo.id) && (
                            <svg
                              className="w-4 h-4 text-black"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white/90 text-lg truncate">
                            {repo.fullName}
                          </div>
                          {repo.language && (
                            <div className="text-sm text-white/50 mt-0.5">
                              {repo.language}
                            </div>
                          )}
                        </div>
                      </div>
                      {repo.isPrivate ? (
                        <span className="text-xs font-bold px-3 py-1 bg-white/10 text-white/80 rounded-full border border-white/20 backdrop-blur-sm flex-shrink-0 ml-2">
                          Private
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-3 py-1 bg-white/5 text-white/60 rounded-full border border-white/10 backdrop-blur-sm flex-shrink-0 ml-2">
                          Public
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
