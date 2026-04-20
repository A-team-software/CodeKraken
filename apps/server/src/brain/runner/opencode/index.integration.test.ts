import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { expect, test } from "vitest";

import { OpenCodeRunner } from "./index";

const TEST_TIMEOUT_MS = 10 * 60 * 1000;
const TOOL_CAPABLE_MODEL_PATTERNS = [
    /qwen/i,
    /coder/i,
    /codestral/i,
    /devstral/i,
    /gpt-oss/i,
    /deepseek-coder/i
];

const opencodeAvailable = await isCommandAvailable("opencode");
const ollamaAvailable = await isCommandAvailable("ollama");
const localModel = opencodeAvailable && ollamaAvailable ? await resolveLocalModel() : null;
const integrationTest = opencodeAvailable && ollamaAvailable && localModel ? test : test.skip;

integrationTest("OpenCodeRunner creates a runnable hello world Node app in an empty git repository", { timeout: TEST_TIMEOUT_MS }, async () => {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-runner-it-"));

    try {
        expect(localModel).toBeTruthy();

        await initializeRepository(repoPath);
        await writeOpenCodeConfig(repoPath, localModel as string);

        const runner = new OpenCodeRunner();
        const result = await runner.start({
            repoUrl: repoPath,
            mode: "agent",
            task: [
                "Create a minimal Node.js hello world app in this repository.",
                "Write package.json in the repository root with a start script that runs 'node index.js'.",
                "Write index.js in the repository root that prints exactly 'hello world'.",
                "Keep the implementation minimal and do not add extra files unless necessary."
            ].join(" ")
        });

        expect(result.success, result.message).toBe(true);

        const packageJsonPath = path.join(repoPath, "package.json");
        const entryPath = path.join(repoPath, "index.js");

        await fs.access(packageJsonPath);
        await fs.access(entryPath);

        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as {
            scripts?: Record<string, string>;
        };

        expect(packageJson.scripts?.start).toBe("node index.js");

        const entryContents = await fs.readFile(entryPath, "utf8");
        expect(entryContents).toMatch(/hello world/i);

        const execution = await execa("node", ["index.js"], {
            cwd: repoPath,
            reject: false,
            stdout: "pipe",
            stderr: "pipe"
        });

        expect(execution.exitCode, execution.stderr || execution.stdout).toBe(0);
        expect(execution.stdout.trim()).toBe("hello world");
    } finally {
        await fs.rm(repoPath, { recursive: true, force: true });
    }
});

async function isCommandAvailable(command: string): Promise<boolean> {
    const result = await execa("sh", ["-lc", `command -v ${command}`], {
        reject: false,
        stdout: "pipe",
        stderr: "pipe"
    });

    if (result.exitCode !== 0) {
        console.warn(`Command "${command}" is not available: ${result.stderr.trim()}`);
    }
    return result.exitCode === 0;
}

async function resolveLocalModel(): Promise<string | null> {
    const configuredModel = process.env.OPENCODE_TEST_OLLAMA_MODEL?.trim();

    if (configuredModel) {
        return configuredModel;
    }

    const result = await execa("ollama", ["list"], {
        reject: false,
        stdout: "pipe",
        stderr: "pipe"
    });

    if (result.exitCode !== 0) {
        console.warn(`Failed to list Ollama models: ${result.stderr.trim()}`);
        return null;
    }

    const lines = result.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const modelLine = lines.find((line) => {
        if (/^name\s+/i.test(line)) {
            return false;
        }

        const modelName = line.split(/\s+/)[0];
        return TOOL_CAPABLE_MODEL_PATTERNS.some((pattern) => pattern.test(modelName));
    });

    if (!modelLine) {
        console.warn("No suitable Ollama model found.");
        return null;
    }

    return modelLine.split(/\s+/)[0];
}

async function initializeRepository(repoPath: string): Promise<void> {
    await execa("git", ["init", "-b", "main"], { cwd: repoPath });
    await execa("git", ["config", "user.name", "OpenCode Runner Test"], { cwd: repoPath });
    await execa("git", ["config", "user.email", "opencode-runner-test@example.com"], { cwd: repoPath });
}

async function writeOpenCodeConfig(repoPath: string, model: string): Promise<void> {
    const config = {
        $schema: "https://opencode.ai/config.json",
        autoupdate: false,
        share: "disabled",
        snapshot: false,
        model: `ollama/${model}`,
        small_model: `ollama/${model}`,
        provider: {
            ollama: {
                npm: "@ai-sdk/openai-compatible",
                name: "Ollama (local)",
                options: {
                    baseURL: "http://127.0.0.1:11434/v1"
                },
                models: {
                    [model]: {
                        name: `Ollama ${model}`
                    }
                }
            }
        },
        permission: {
            execution: { "*": "allow" },
            filesystem: { "*": "allow" },
            network: { "*": "allow" }
        }
    };

    await fs.writeFile(path.join(repoPath, "opencode.json"), JSON.stringify(config, null, 2));
}
