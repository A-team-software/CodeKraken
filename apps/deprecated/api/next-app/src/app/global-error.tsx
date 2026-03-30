"use client";

import * as React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head />
      <body className="bg-slate-950 text-white flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full px-6 py-12 text-center space-y-6 glass rounded-2xl border border-red-500/20">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">A critical error occurred</h2>
            <p className="text-slate-400 text-sm">
              {error.message ||
                "The application encountered an unexpected error."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => reset()}
            className="block w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
