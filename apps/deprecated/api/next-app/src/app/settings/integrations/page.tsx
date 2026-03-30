"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Key,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";

interface Token {
  id: string;
  name: string;
  lastUsedAt?: string;
  createdAt: string;
}

export default function PATSettingsPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<{ name: string; rawToken: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      const data = await res.json();
      setTokens(data.tokens);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTokenName }),
      });

      if (!res.ok) throw new Error("Failed to create token");
      const data = await res.json();
      
      setGeneratedToken({
        name: data.token.name,
        rawToken: data.token.rawToken
      });
      setNewTokenName("");
      fetchTokens();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this token? Any application using it will lose access.")) return;

    try {
      const res = await fetch(`/api/auth/tokens/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke token");
      fetchTokens();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <div className="border-b border-slate-800 py-6 px-6 sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-slate-800 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            Security & Access Tokens
          </h1>
        </div>
      </div>

      <div className="py-12 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Key className="w-24 h-24 rotate-12" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <h2 className="text-xl font-semibold text-white">Create a Personal Access Token</h2>
              <p className="text-slate-400 max-w-2xl">
                Personal access tokens function like ordinary OAuth access tokens. They can be used 
                to authenticate with our API from external tools like Jira Forge.
              </p>

              <form onSubmit={handleCreateToken} className="flex gap-3 max-w-lg mt-6">
                <input
                  type="text"
                  placeholder="Token name (e.g. Jira Forge)"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <Button 
                  type="submit" 
                  disabled={creating || !newTokenName}
                  variant="white"
                  className="rounded-lg gap-2"
                >
                  {creating ? "Creating..." : <><Plus className="w-4 h-4" /> Generate</>}
                </Button>
              </form>
            </div>
          </div>

          {/* Generated Token Display (One-time) */}
          {generatedToken && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-blue-400 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Token generated successfully!
              </div>
              <p className="text-sm text-blue-200/80">
                Make sure to copy your personal access token now. You won't be able to see it again!
              </p>
              <div className="flex items-center gap-3 bg-slate-950/80 p-4 rounded-lg border border-blue-500/20">
                <code className="flex-1 font-mono text-lg text-blue-100 break-all">
                  {generatedToken.rawToken}
                </code>
                <button
                  onClick={() => copyToClipboard(generatedToken.rawToken)}
                  className="p-2 hover:bg-slate-800 rounded-md transition-colors flex flex-col items-center gap-1"
                >
                  {copied ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-400" />
                  )}
                  <span className="text-xs text-slate-500">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setGeneratedToken(null)}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
              >
                I've copied it, dismiss this message
              </Button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}

          {/* Tokens List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Your Tokens</h2>
            
            {loading ? (
              <div className="grid gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : tokens.length === 0 ? (
              <div className="bg-slate-900 rounded-xl p-12 border border-slate-800 text-center space-y-2">
                <Key className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-slate-400">You haven't generated any access tokens yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {tokens.map((token) => (
                  <div 
                    key={token.id} 
                    className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{token.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Created: {new Date(token.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Last used: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleRevokeToken(token.id)}
                      className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Revoke Token"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-8 rounded-xl border border-dashed border-slate-800 text-slate-500 text-sm">
            <p>
              <strong>Security Tip:</strong> Treat tokens like passwords. Never share them or commit them 
              to source control. If you suspect a token has been compromised, revoke it immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
