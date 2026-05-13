import { ChildProcess, spawn } from "child_process";

interface DockerTunnelConfig {
  port: number;
  ngrokUrl: string;
}

let tunnelStarted = false;
let lastConfig: DockerTunnelConfig | null = null;
let lastError: string | null = null;
let tunnelProcess: ChildProcess | null = null;

export function getDockerTunnelStatus(): {
  enabled: boolean;
  started: boolean;
  hasToken: boolean;
  ngrokUrl: string;
  port: number;
  error: string | null;
} {
  return {
    enabled: process.env.IS_LOCAL_DOCKER === "true",
    started: tunnelStarted,
    hasToken: Boolean(process.env.NGROK_TOKEN),
    ngrokUrl: lastConfig?.ngrokUrl || process.env.NGROK_URL || "oliver-ai.ngrok.io",
    port: lastConfig?.port || parseInt(process.env.PORT || "3000", 10),
    error: lastError,
  };
}

export async function startDockerTunnel(config: DockerTunnelConfig): Promise<void> {
  lastConfig = config;

  if (tunnelStarted && tunnelProcess && !tunnelProcess.killed) {
    console.log("[Docker Tunnel] Already started, skipping...");
    return;
  }

  const isLocalDocker = process.env.IS_LOCAL_DOCKER === "true";

  if (!isLocalDocker) {
    console.log("[Docker Tunnel] IS_LOCAL_DOCKER not enabled, skipping tunnel startup");
    return;
  }

  const ngrokToken = process.env.NGROK_TOKEN;
  if (!ngrokToken) {
    lastError = "NGROK_TOKEN not set";
    console.warn("[Docker Tunnel] NGROK_TOKEN not set, cannot start tunnel");
    return;
  }

  try {
    console.log(
      `[Docker Tunnel] Starting ngrok tunnel on port ${config.port} with URL ${config.ngrokUrl}`
    );

    const ngrokArgs = ["http", String(config.port), "--hostname", config.ngrokUrl];
    const child = spawn("ngrok", ngrokArgs, {
      env: {
        ...process.env,
        NGROK_AUTHTOKEN: ngrokToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    tunnelProcess = child;

    child.once("spawn", () => {
      tunnelStarted = true;
      lastError = null;
      console.log("[Docker Tunnel] Tunnel process started");
    });

    child.once("error", (error) => {
      tunnelStarted = false;
      lastError = error.message;
      tunnelProcess = null;
      console.error(`[Docker Tunnel] Error starting ngrok: ${error.message}`);
    });

    child.on("exit", (code, signal) => {
      tunnelStarted = false;
      tunnelProcess = null;
      if (code === 0) {
        console.log("[Docker Tunnel] ngrok process exited normally");
        return;
      }

      lastError = `ngrok exited with code ${code ?? "unknown"}, signal ${signal ?? "none"}`;
      console.error(`[Docker Tunnel] ${lastError}`);
    });

    child.stdout?.on("data", (data) => {
      const message = data.toString().trim();
      if (message) {
        console.log(`[Docker Tunnel] ${message}`);
      }
    });

    child.stderr?.on("data", (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[Docker Tunnel] ${message}`);
      }
    });
  } catch (error) {
    tunnelStarted = false;
    tunnelProcess = null;
    lastError = error instanceof Error ? error.message : "Unknown tunnel startup error";
    console.error("[Docker Tunnel] Failed to start docker tunnel:", error);
  }
}
