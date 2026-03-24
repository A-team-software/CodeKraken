"use client";

import { EnvironmentProvider } from "@/context/EnvironmentContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <EnvironmentProvider>{children}</EnvironmentProvider>;
}
