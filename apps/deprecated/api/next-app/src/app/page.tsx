"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../../components/ui/button";
import { LoginModal } from "../../components/auth/LoginModal";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type User = {
  id?: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
  image?: string;
  email?: string;
};

export default function HomePage() {
  const [activeHeadline, setActiveHeadline] = useState(0);
  const [activeImage, setActiveImage] = useState(0);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  // Fetch logged in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  const headlines = [
    "Turn Tickets into PRs using OliverAI.",
    "Ticket To Production Grade Code With OliverAI.",
    "Accelerate Your Ticket to PR process with OliverAI.",
    "Fast Ticket to PR Accelerated By OliverAI.",
    "Ticket To Scalable Code With OliverAI.",
    "Ticket To Production Grade Code Generation.",
    "Accelerate Your Sprints With OliverAI.",
    "Code For Production With OliverAI.",
    "Ticket To Production Grade Software With OliverAI.",
  ];

  const backgroundImages = [
    "/hero/board.png",
    "/hero/board1.png",
    "/hero/board2.png",
    "/hero/broad3.png",
    "/hero/board4.png",
    "/hero/board5.png",
    "/hero/board8.png",
    "/hero/b1.png",
    "/hero/b2.png",
    "/hero/b3.jpg",
    "/hero/b4.png",
    "/hero/b5.png",
    "/hero/b6.png",
    "/hero/b7.jpg",
    "/hero/b8.png",
    "/hero/b9.jpg",
  ];

  // Text Rotation
  useEffect(() => {
    const textTimer = setInterval(() => {
      setActiveHeadline((prev) => (prev + 1) % headlines.length);
    }, 4000);
    return () => clearInterval(textTimer);
  }, [headlines.length]);

  // Image Rotation
  useEffect(() => {
    const imageTimer = setInterval(() => {
      setActiveImage((prev) => (prev + 1) % backgroundImages.length);
    }, 7000);
    return () => clearInterval(imageTimer);
  }, [backgroundImages.length]);

  const GIT_PROVIDERS = new Set(["github", "bitbucket"]);
  const BOARD_PROVIDERS = new Set(["jira", "trello", "asana", "linear"]);

  const handleSignIn = async (provider: string) => {
    try {
      setIsLoginModalOpen(false);

      let oauthPath: string;
      if (GIT_PROVIDERS.has(provider)) {
        oauthPath = `/api/git/${provider}/oauth`;
      } else if (BOARD_PROVIDERS.has(provider)) {
        oauthPath = `/api/boards/${provider}/oauth`;
      } else {
        console.error(`No OAuth flow for provider: ${provider}`);
        return;
      }

      const res = await fetch(oauthPath);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to initiate oauth", errorText);
        return;
      }
      const data = await res.json();
      if (data.loginUrl) {
        window.location.href = data.loginUrl;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openLoginModal = () => setIsLoginModalOpen(true);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white selection:bg-blue-500/30 font-sans flex flex-col">
      {/* Navbar */}
      <header className="bg-transparent pt-6">
        <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 group-hover:scale-105 transition-transform">
              <Image
                src={"/flat_icon.jpeg"}
                alt="OliverAI Logo"
                width={80}
                height={80}
                className="rounded-lg opacity-90"
              />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              OliverAI
            </span>
          </Link>

          <div className="flex items-center">
            {loadingUser ? (
              <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
            ) : user ? (
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 hover:border-white transition-colors">
                  {user.avatarUrl || user.image ? (
                    <Image
                      src={user.avatarUrl || user.image || ""}
                      alt={user.name || "User Avatar"}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {(user.name || user.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
              </Link>
            ) : (
              <Button
                type="button"
                onClick={openLoginModal}
                variant="white-outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-medium rounded-full px-6"
              >
                Log In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Split Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
        {/* Left Column: Text & Actions */}
        <div className="flex-1 flex flex-col items-start justify-center text-left space-y-12 z-10 w-full lg:max-w-xl">
          <div className="relative h-64 md:h-80 w-full">
            {headlines.map((headline, index) => (
              <motion.h1
                key={index}
                initial={{
                  opacity: 0,
                  y: 20,
                  scale: 0.95,
                  filter: "blur(10px)",
                }}
                animate={{
                  opacity: index === activeHeadline ? 1 : 0,
                  y: index === activeHeadline ? 0 : 20,
                  scale: index === activeHeadline ? 1 : 0.95,
                  filter: index === activeHeadline ? "blur(0px)" : "blur(10px)",
                }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={`absolute inset-0 text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]
                      bg-clip-text text-transparent bg-gradient-to-r from-white via-white/90 to-gray-400`}
              >
                {headline}
              </motion.h1>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full pt-4">
            <Button
              type="button"
              onClick={() => handleSignIn("github")}
              className="flex-1 h-14 text-lg font-bold rounded-2xl bg-white text-black hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all hover:scale-105"
            >
              <span className="inline-flex items-center gap-3">
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub
              </span>
            </Button>

            <Button
              type="button"
              onClick={() => handleSignIn("bitbucket")}
              className="flex-1 h-14 text-lg font-bold rounded-2xl bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-xl transition-all hover:scale-105"
            >
              <span className="inline-flex items-center gap-3">
                <svg
                  className="w-6 h-6 text-[#2684ff]"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M2.6 2h18.8l-2.9 18.2h-13L2.6 2z M13.8 14.6l1.3-7.5H8.9l1.1 7.5h3.8z" />
                </svg>
                Bitbucket
              </span>
            </Button>
          </div>
        </div>

        {/* Right Column: Image Deck Stack */}
        <div className="flex-1 relative w-full max-w-[500px] lg:max-w-none aspect-[4/3] lg:aspect-square h-auto lg:h-[600px] perspective-1000 group flex items-end">
          {/* We render 3 cards with different offsets, but avoid the problematic AnimatePresence mode="popLayout" */}
          {backgroundImages.map((src, realIndex) => {
            const isCurrent = realIndex === activeImage;
            const isNext =
              realIndex === (activeImage + 1) % backgroundImages.length;
            const isThird =
              realIndex === (activeImage + 2) % backgroundImages.length;

            if (!isCurrent && !isNext && !isThird) return null;

            const offset = isCurrent ? 0 : isNext ? 1 : 2;

            return (
              <motion.div
                key={src}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{
                  opacity: offset === 0 ? 1 : offset === 1 ? 0.7 : 0.4,
                  scale: offset === 0 ? 1 : offset === 1 ? 0.96 : 0.92,
                  y: offset === 0 ? 0 : offset === 1 ? -6 : -12,
                  zIndex: offset === 0 ? 20 : offset === 1 ? 10 : 0,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute inset-0 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-gray-900 origin-bottom"
              >
                <Image
                  src={src}
                  alt="Platform Preview"
                  fill
                  className="object-cover object-top"
                  priority={isCurrent}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-80" />

                {isCurrent && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-lg border border-white/10 p-4 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-sm font-medium text-white/90">
                        Automate Your Sprints With OliverAI.
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 font-medium tracking-wide">
              &copy; {new Date().getFullYear()} OliverAI. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-500 hover:text-white transition-smooth"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-500 hover:text-white transition-smooth"
              >
                Terms of Service
              </Link>
              <Link
                href="/support"
                className="text-gray-500 hover:text-white transition-smooth"
              >
                Support
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleSignIn}
      />
    </div>
  );
}
