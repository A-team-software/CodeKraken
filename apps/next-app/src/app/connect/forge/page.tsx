"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "components/ui/button";
import { LoginModal } from "components/auth/LoginModal";

/**
 * Forge Connect Popup
 *
 * Flow:
 *  1. Parse `clientKey`, `accountId`, `provider` from URL or sessionStorage (to survive redirects).
 *  2. Check if user is already associated and has a Git token via `/api/forge/connect/resolve-user`.
 *  3. If not, check if they are logged into SCA via `/api/user/me`.
 *     a. If logged in: call `/api/forge/connect/associate`, then either complete or redirect to Git OAuth.
 *     b. If not logged in: show LoginModal to force them to sign in.
 *  4. After web-app sign-in, page remounts and continues at step 3.a.
 */

const SESSION_STORAGE_KEY = "oliverai:forge:identity_v2";

function ConnectionContent() {
  const searchParams = useSearchParams();

  const clientKeyParam = searchParams.get("clientKey");
  const accountIdParam = searchParams.get("accountId");
  const providerParam = searchParams.get("provider") || "github";

  const [status, setStatus] = useState<
    "verifying" | "resolving" | "associating" | "git_connecting" | "complete" | "error"
  >("verifying");
  const [error, setError] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [forgeIdentity, setForgeIdentity] = useState<{
    accountId: string;
    clientKey: string;
    provider: string;
  } | null>(null);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bootstrap = async () => {
    // 1. Get identity from URL or session
    let identity: { clientKey: string; accountId: string; provider: string } | null = null;
    if (clientKeyParam && accountIdParam) {
      identity = { clientKey: clientKeyParam, accountId: accountIdParam, provider: providerParam };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(identity));
    } else {
      const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (cached) {
        try {
            identity = JSON.parse(cached);
        } catch {
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    }

    if (!identity?.clientKey || !identity?.accountId) {
      setError("Missing connection parameters (clientKey or accountId). Please verify your Jira app configuration or try again.");
      setStatus("error");
      return;
    }

    setForgeIdentity(identity);
    setStatus("resolving");

    try {
      // 2. See if the user is already fully connected and has git token
      const qs = new URLSearchParams({
        accountId: identity.accountId,
        clientKey: identity.clientKey,
        provider: identity.provider,
      });
      const resolveRes = await fetch(`/api/forge/connect/resolve-user?${qs.toString()}`);
      if (resolveRes.ok) {
        const resolveData = await resolveRes.json();
        if (resolveData.found && resolveData.hasGitToken) {
           completeFlow(identity);
           return;
        }
      }

      // 3. User is not fully connected or doesn't have Git.
      // Check if they are logged into the web app currently.
      const sessionRes = await fetch("/api/user/me");
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (sessionData.authenticated && sessionData.user) {
          // They are logged into the web app!
          // Associate them
          setStatus("associating");
          const assocRes = await fetch("/api/forge/connect/associate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: sessionData.user.id,
              accountId: identity.accountId,
              clientKey: identity.clientKey,
            }),
          });

          if (!assocRes.ok) {
            const data = await assocRes.json();
            throw new Error(data.error || "Failed to link accounts");
          }

          // Start Git OAuth if needed, or if the user we just associated ALREADY has a git token, we complete.
          const reResolve = await fetch(`/api/forge/connect/resolve-user?${qs.toString()}`);
          if (reResolve.ok) {
            const reData = await reResolve.json();
            if (reData.found && reData.hasGitToken) {
              completeFlow(identity);
              return;
            }
          }
          await initiateGitOAuth(identity);
          return;
        }
      }

      // 4. Not fully connected, and not logged in.
      // Show login modal.
      setIsLoginModalOpen(true);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to resolve connection.");
      setStatus("error");
    }
  };

  const initiateGitOAuth = async (identity: {
    accountId: string;
    clientKey: string;
    provider: string;
  }) => {
    setStatus("git_connecting");
    try {
      // Using clientKey in metadata to track the forge association context if needed
      const metadata = JSON.stringify({
        accountId: identity.accountId,
        clientKey: identity.clientKey,
      });
      const res = await fetch(
        `/api/git/${identity.provider}/oauth?metadata=${encodeURIComponent(metadata)}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to initiate Git connection");
      }

      const data = await res.json();
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      } else {
        throw new Error("No login URL received");
      }
    } catch (err: any) {
      console.error("Git connection failed", err);
      setError(err.message || "Failed to start Git connection");
      setStatus("error");
    }
  };

  const completeFlow = (identity: {
    accountId: string;
    clientKey: string;
    provider: string;
  }) => {
    // Clear cached identity — connection is done
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setStatus("complete");
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oliverai:forge:oauth_complete",
          ok: true,
          provider: identity.provider,
          integrationId: identity.accountId,
        },
        "*"
      );
      setTimeout(() => window.close(), 2000);
    }
  };

  const handleSignIn = async (providerLogin: string) => {
    setIsLoginModalOpen(false);
    try {
      let oauthPath: string;
      const GIT_PROVIDERS = new Set(["github", "bitbucket"]);
      const BOARD_PROVIDERS = new Set(["jira", "trello", "asana", "linear"]);

      if (GIT_PROVIDERS.has(providerLogin)) {
        oauthPath = `/api/git/${providerLogin}/oauth`;
      } else if (BOARD_PROVIDERS.has(providerLogin)) {
        oauthPath = `/api/boards/${providerLogin}/oauth`;
      } else {
        console.error(`No OAuth flow for provider: ${providerLogin}`);
        return;
      }

      // returnTo = this page (identity is in sessionStorage so it will resume)
      const returnTo = encodeURIComponent("/connect/forge");
      const res = await fetch(`${oauthPath}?returnTo=${returnTo}`);
      if (!res.ok) {
        setError("Failed to start login flow");
        setStatus("error");
        return;
      }
      const data = await res.json();
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      }
    } catch (e) {
      console.error(e);
      setError("Failed to start login flow");
      setStatus("error");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="text-red-500 text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold">Connection Failed</h1>
        <p className="text-gray-400 max-w-md">{error}</p>
        <Button onClick={() => window.close()} variant="black-outline">
          Close Window
        </Button>
      </div>
    );
  }

  const statusLabels: Record<string, { heading: string; sub: string }> = {
    verifying:      { heading: "Checking connection...",    sub: "Reading your connection details." },
    resolving:      { heading: "Checking account...",       sub: "Looking up your OliverAI account." },
    associating:    { heading: "Linking Jira Account...",   sub: "Connecting your Atlassian identity to OliverAI." },
    git_connecting: { heading: "Connecting to Git...",      sub: "Redirecting you to complete Git authentication." },
    complete:       { heading: "Success!",                  sub: "Your accounts are now linked. You can go back to Jira." },
  };

  const label = statusLabels[status] ?? { heading: "Working...", sub: "" };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-8 max-w-lg mx-auto min-h-[60vh]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
          <Image src="/flat_icon.jpeg" alt="Logo" width={48} height={48} className="rounded-lg" />
        </div>
        <div className="h-0.5 w-12 bg-blue-500/50" />
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
          <svg className="w-10 h-10 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.6 2h18.8l-2.9 18.2h-13L2.6 2z M13.8 14.6l1.3-7.5H8.9l1.1 7.5h3.8z" />
          </svg>
        </div>
      </motion.div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white">{label.heading}</h1>
        <p className="text-gray-400">{label.sub}</p>
      </div>

      {status !== "complete" && status !== "error" && (
        <div className="w-full max-w-xs h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}

      {status === "complete" && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400"
        >
          <p className="font-medium">Everything is set up! This window will close automatically.</p>
        </motion.div>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleSignIn}
      />
    </div>
  );
}

export default function ConnectionPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30 flex flex-col items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <ConnectionContent />
      </Suspense>
    </div>
  );
}
