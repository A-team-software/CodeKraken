"use client";

import React from "react";
import { Button } from "../ui/button";
import { Github, Trello, CheckSquare, Workflow } from "lucide-react";

// Bitbucket icon component if not available in lucide-react (it usually is not)
const BitbucketIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M2.6 2h18.8l-2.9 18.2h-13L2.6 2z M13.8 14.6l1.3-7.5H8.9l1.1 7.5h3.8z" />
  </svg>
);

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (provider: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
}) => {
  const handleLogin = (provider: string) => {
    onLogin(provider);
  };

  return (
    <div
      className={
        isOpen
          ? "fixed inset-0 z-50 flex items-center justify-center"
          : "hidden"
      }
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white text-black shadow-2xl border border-black/10">
        <div className="p-6 border-b border-black/10">
          <h2 className="text-lg font-semibold text-center">Sign In using</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <Button
              type="button"
              onClick={() => handleLogin("github")}
              variant="black"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleLogin("bitbucket")}
              variant="white"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium"
            >
              <BitbucketIcon className="w-5 h-5 text-[#0052CC]" />
              <span>Bitbucket</span>
            </Button>

            <div className="border-t border-gray-200 my-4 pt-4">
              <p className="text-xs text-gray-500 text-center mb-3">
                Board Providers
              </p>
            </div>

            <Button
              type="button"
              onClick={() => handleLogin("jira")}
              variant="white"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium"
            >
              <Trello className="w-5 h-5 text-[#0052CC]" />
              <span>Jira</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleLogin("trello")}
              variant="white"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium"
            >
              <Trello className="w-5 h-5 text-[#0079BF]" />
              <span>Trello</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleLogin("asana")}
              variant="white"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium"
            >
              <CheckSquare className="w-5 h-5 text-[#F06A6A]" />
              <span>Asana</span>
            </Button>

            <Button
              type="button"
              onClick={() => handleLogin("linear")}
              variant="white"
              className="w-full flex items-center justify-center gap-3 h-12 text-base font-medium"
            >
              <Workflow className="w-5 h-5 text-[#5E6AD2]" />
              <span>Linear</span>
            </Button>
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};
