import { runDocker } from "./run_docker";
import fs from 'fs/promises';
import path from 'path';
import { createSessionId } from "./session";
import os from "os";

export async function runSolve(task: string, apiKey: string) {
    const sessionId = createSessionId()

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `${sessionId}-`));

    const configPath = path.join(workDir, "opencode.json");

    await fs.writeFile(configPath, JSON.stringify({
        provider: {
            groq: {
                type: "openai-compatible",
                baseURL: "https://api.groq.com/openai/v1",
                apiKey: apiKey
            }
        },
        model: {
            provider: "groq",
            name: "llama-3.1-8b-instant"
        }
    }));

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
            `${workDir}:/workspace`,
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
