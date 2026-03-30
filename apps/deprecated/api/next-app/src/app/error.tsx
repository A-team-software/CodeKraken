"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../../components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="glass rounded-xl p-8 border border-red-500/20 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-slate-400">
              {error.message || "An unexpected error occurred"}
            </p>
          </div>
          <Button
            onClick={reset}
            variant="black"
            size="md"
            className="w-full rounded-lg"
          >
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
