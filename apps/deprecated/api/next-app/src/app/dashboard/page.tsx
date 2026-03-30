"use client";

import {
  Code2,
  Settings,
  LogOut,
  Zap,
  Save,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useEffect, useState } from "react";
import { useEnvironment } from "@/context/EnvironmentContext";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "settings">(
    "overview",
  );
  const { isEmbedded, isLoading: envLoading } = useEnvironment();
  const [settings, setSettings] = useState({
    opencode: {
      groqApiKey: "",
      model: "llama3-70b-8192",
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/user/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings(data.settings);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setMessage({ text: "Settings saved successfully!", type: "success" });
      } else {
        setMessage({ text: "Failed to save settings.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "An error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch (err) {
      console.error("Failed to sign out", err);
      // Fallback redirect even if fetch fails to ensure user "disconnects"
      window.location.href = "/";
    }
  };

  if (envLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col gap-8 bg-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold tracking-tight">OpenCodeIA</span>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "overview" ? "bg-white/10 text-white font-bold" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "settings" ? "bg-white/10 text-white font-bold" : "text-white/40 hover:text-white hover:bg-white/5"}`}
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/5 transition-all w-full"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 md:p-12 max-w-5xl mx-auto w-full">
          {activeTab === "overview" ? (
            <div className="space-y-12">
              <header>
                <h1 className="text-5xl font-extrabold tracking-tight mb-4">
                  Welcome back
                </h1>
                <p className="text-xl text-white/50">
                  Your agentic workspace is ready.
                </p>
              </header>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Code2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Projects</h3>
                  <p className="text-white/50 mb-6">
                    Manage your auto-generated codebase and AI tasks.
                  </p>
                  <Button variant="white" className="rounded-xl px-6">
                    View Projects
                  </Button>
                </div>

                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Quick Action</h3>
                  <p className="text-white/50 mb-6">
                    Let the AI solve your next complex issue instantly.
                  </p>
                  <Button variant="white" className="rounded-xl px-6">
                    Start Solving
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <header>
                <h1 className="text-5xl font-extrabold tracking-tight mb-4">
                  Settings
                </h1>
                <p className="text-xl text-white/50">
                  Tweak Opencode's behavior and environment.
                </p>
              </header>

              <div className="max-w-2xl space-y-8">
                <div className="space-y-6 p-8 rounded-3xl bg-white/5 border border-white/10">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <Zap className="w-6 h-6 text-yellow-400" />
                    Opencode Configuration
                  </h2>

                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-sm font-medium text-white/60 mb-2 block">
                        Groq API Key
                      </span>
                      <input
                        type="password"
                        value={settings.opencode.groqApiKey}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            opencode: {
                              ...settings.opencode,
                              groqApiKey: e.target.value,
                            },
                          })
                        }
                        placeholder="gsk_..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-white/60 mb-2 block">
                        Model Platform
                      </span>
                      <select
                        value={settings.opencode.model}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            opencode: {
                              ...settings.opencode,
                              model: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                      >
                        <option value="llama3-70b-8192">
                          Llama 3 70B (Groq)
                        </option>
                        <option value="llama3-8b-8192">
                          Llama 3 8B (Groq)
                        </option>
                        <option value="mixtral-8x7b-32768">
                          Mixtral 8x7B (Groq)
                        </option>
                      </select>
                    </label>
                  </div>

                  {message.text && (
                    <div
                      className={`p-4 rounded-xl text-center font-medium ${message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {message.text}
                    </div>
                  )}

                  <div className="pt-6">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="w-full h-14 bg-white text-black hover:bg-gray-200 font-bold rounded-xl flex items-center justify-center gap-3"
                    >
                      {saving ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Remove old navigation and stats constants
