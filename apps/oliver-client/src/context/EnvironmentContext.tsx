"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

export type Environment = "standalone" | "jira" | "trello" | "linear";

interface EnvironmentContextType {
  env: Environment;
  isEmbedded: boolean;
  context: any; // Context data from host (e.g. issueId, projectKey)
  isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType>({
  env: "standalone",
  isEmbedded: false,
  context: {},
  isLoading: true,
});

export function EnvironmentProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [env, setEnv] = useState<Environment>("standalone");
  const [context, setContext] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectEnvironment = async () => {
      if (typeof window === "undefined") return;

      // 1. Check for Jira / Atlassian Connect
      // AP global is injected by all.js from Atlassian
      // @ts-ignore
      if (window.AP || window.location.search.includes("xdm_e")) {
        setEnv("jira");
        // If AP is available, we can get context
        // @ts-ignore
        if (window.AP && window.AP.context) {
          try {
            // @ts-ignore
            window.AP.context.getContext((context: any) => {
              setContext(context);
            });
          } catch (e) {
            console.warn("Failed to get Jira context", e);
          }
        }
      }

      // 3. Default to Standalone
      else {
        setEnv("standalone");
      }

      setIsLoading(false);
    };

    detectEnvironment();
  }, []);

  const isEmbedded = env !== "standalone";

  return (
    <EnvironmentContext.Provider
      value={{ env, isEmbedded, context, isLoading }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export const useEnvironment = () => useContext(EnvironmentContext);
