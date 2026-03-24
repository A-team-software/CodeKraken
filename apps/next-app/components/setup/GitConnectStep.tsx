import React, { useState } from "react";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

interface GitConnectStepProps {
  onConnect: (provider: "github" | "bitbucket") => void;
}

export function GitConnectStep({ onConnect }: GitConnectStepProps) {
  const [connecting, setConnecting] = useState<"github" | "bitbucket" | null>(
    null,
  );

  const handleConnect = (provider: "github" | "bitbucket") => {
    setConnecting(provider);
    onConnect(provider);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-gray-400">
          Connect your Git Provider
        </h2>
        <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto">
          Please authenticate with GitHub or Bitbucket so we can access your
          repositories.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 w-full mt-8">
        <Button
          type="button"
          onClick={() => handleConnect("github")}
          disabled={connecting !== null}
          className="flex-1 h-32 text-xl font-bold rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          <span className="flex flex-col items-center gap-3">
            {connecting === "github" ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <svg
                className="w-8 h-8 text-white/90"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            Connect GitHub
          </span>
        </Button>

        <Button
          type="button"
          onClick={() => handleConnect("bitbucket")}
          disabled={connecting !== null}
          className="flex-1 h-32 text-xl font-bold rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          <span className="flex flex-col items-center gap-3">
            {connecting === "bitbucket" ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <svg
                className="w-8 h-8 text-[#2684ff]"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M2.6 2h18.8l-2.9 18.2h-13L2.6 2z M13.8 14.6l1.3-7.5H8.9l1.1 7.5h3.8z" />
              </svg>
            )}
            Connect Bitbucket
          </span>
        </Button>
      </div>
    </div>
  );
}
