import { runDocker } from "./docker";

export async function runSolve(task: string, apiKey: string) {
    return runDocker(
        [
            "run",
            "--rm",
            "--cpus=1",
            "--memory=2g",
            "--pids-limit=128",
            "--cap-drop=ALL",
            "--security-opt=no-new-privileges",
            "-e",
            `GROQ_API_KEY=${apiKey}`,
            "-v",
            "/tmp/opencode-sessions:/root/.local/share/opencode/storage",
            "opencode-sandbox",
            "sh",
            "-c",
            `
cd /workspace && \
opencode run "${task}" --format json
`,
        ],
        { timeout: 120_000 }
    );
}
