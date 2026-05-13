import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface DockerTunnelConfig {
  port: number;
  ngrokUrl: string;
}

let tunnelStarted = false;
let lastConfig: DockerTunnelConfig | null = null;
let lastError: string | null = null;

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

  if (tunnelStarted) {
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

    // Start ngrok tunnel in the background
    const ngrokCommand = `ngrok http ${config.port} --authtoken ${ngrokToken} --hostname ${config.ngrokUrl}`;
    
    // Run ngrok in the background (non-blocking)
    exec(ngrokCommand, (error, stdout, stderr) => {
      if (error) {
        lastError = error.message;
        console.error(`[Docker Tunnel] Error starting ngrok: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`[Docker Tunnel] ngrok stderr: ${stderr}`);
      }
      console.log(`[Docker Tunnel] ngrok output: ${stdout}`);
    });

    tunnelStarted = true;
    lastError = null;
    console.log("[Docker Tunnel] Tunnel startup initiated successfully");
  } catch (error) {
    lastError = error instanceof Error ? error.message : "Unknown tunnel startup error";
    console.error("[Docker Tunnel] Failed to start docker tunnel:", error);
  }
}
