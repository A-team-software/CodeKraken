"use client";

import { useEffect } from "react";

export default function TrelloPowerUpPage() {
  useEffect(() => {
    // Initialize Trello Power-Up
    if (typeof window !== "undefined" && window.TrelloPowerUp) {
      const t = window.TrelloPowerUp.iframe();

      // This page handles the capability rendering (e.g. card-back section)
      // For now, we just render a placeholder or handle initialization
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <h1 className="text-xl font-bold mb-4">OliverAI for Trello</h1>
      <p className="text-gray-600">Initializing Power-Up...</p>
    </div>
  );
}

// Global type augmentation
declare global {
  interface Window {
    TrelloPowerUp: any;
  }
}
