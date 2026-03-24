"use client";

import React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative">
        {/* Header */}
        <div className="border-b border-slate-800 py-6 px-6">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded-lg transition-smooth"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl font-bold">About OliverAI</h1>
          </div>
        </div>

        {/* Content */}
        <div className="py-20 px-6">
          <div className="max-w-4xl mx-auto space-y-12">
            <section className="space-y-4">
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-slate-300">
                OliverAI exists to empower developers by automating the
                repetitive aspects of software development. We believe that AI
                should handle the boilerplate while developers focus on what
                makes their product unique.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-3xl font-bold mb-4">Why OliverAI?</h2>
              <ul className="space-y-3 text-slate-300">
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>
                    <strong>Seamless Integration:</strong> Works with your
                    favorite project management tools
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>
                    <strong>Production Ready:</strong> Generated code follows
                    best practices and industry standards
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>
                    <strong>Time Savings:</strong> Reduce development time by up
                    to 50%
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-400 font-bold">•</span>
                  <span>
                    <strong>Context Aware:</strong> AI learns your coding
                    patterns and preferences
                  </span>
                </li>
              </ul>
            </section>

            <section className="glass rounded-xl p-8 border border-slate-700/50">
              <h2 className="text-2xl font-bold mb-4">The OliverAI Team</h2>
              <p className="text-slate-300">
                Built by passionate developers and AI enthusiasts who believe in
                the power of automation. Our team is dedicated to making
                software development faster, easier, and more enjoyable.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
