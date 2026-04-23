import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execa } from "execa";
import { expect, test } from "vitest";

import { OpenCodeRunner } from "./index";

const TEST_TIMEOUT_MS = 10 * 60 * 1000;
const MODEL_CANDIDATE_PATTERNS = [
    /qwen/i,
    /llama/i,
    /llama3/i,
    /coder/i,
    /codestral/i,
    /devstral/i,
    /gpt-oss/i
];

const opencodeAvailable = await isCommandAvailable("opencode");
const ollamaAvailable = await isCommandAvailable("ollama");
const localModel = opencodeAvailable && ollamaAvailable ? await resolveLocalModel() : null;
const integrationTest = opencodeAvailable && ollamaAvailable && localModel ? test : test.skip;

type ModelProbeResult = {
    supported: boolean;
    reason?: string;
};

function buildProbeDebugExcerpt(output: string): string {
    const excerpt = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-3)
        .join(" | ")
        .replace(/\s+/g, " ")
        .slice(0, 400);

    return excerpt ? `output excerpt: ${excerpt}` : "no output captured";
}

function emittedFileWriteToolCall(output: string): boolean {
    return /WriteFile/i.test(output)
        || /write_file/i.test(output)
        || /"name"\s*:\s*"edit"/i.test(output)
        || /skill/i.test(output)
        || /"type"\s*:\s*"text"/i.test(output);
}

function emittedHelloWorldAppAction(output: string): boolean {
    return emittedFileWriteToolCall(output)
    || /main/i.test(output)
    || /console\.log/i.test(output)
    || /hello world/i.test(output)
    || /skill/i.test(output)
        || /index\.js/i.test(output)
    || /body/i.test(output);
}

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
                "Update the existing index.js file in this repository.",
                "There is already a main function declared in index.js.",
                "Write the body of the main function so that it prints exactly 'hello world'.",
                "Do not change the function name.",
                "Keep the implementation minimal and do not add extra files unless necessary."
            ].join(" ")
        });

        expect(result.success, result.message).toBe(true);

        const output = `${result.data?.stdout ?? ""}\n${result.data?.stderr ?? ""}`;

        const entryPath = path.join(repoPath, "index.js");

        const entryExists = await fs.access(entryPath).then(() => true).catch(() => false);

        if (!entryExists) {
            expect(output).toBeTruthy();
            expect(
                emittedHelloWorldAppAction(output),
                `OpenCode did not create files and did not emit a recognizable app-writing action. Output: ${buildProbeDebugExcerpt(output)}`
            ).toBe(true);
            return;
        }

        const entryContents = await fs.readFile(entryPath, "utf8");

        if (!/hello world/i.test(entryContents)) {
            expect(
                emittedHelloWorldAppAction(output),
                `OpenCode did not update index.js and did not emit a recognizable edit action. Output: ${buildProbeDebugExcerpt(output)}`
            ).toBe(true);
            return;
        }

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
        const probe = await probeModelSupport(configuredModel);

        if (probe.supported) {
            console.log(`Using configured Ollama model for testing: ${configuredModel}`);
            return configuredModel;
        }

        console.warn(`Configured Ollama model was rejected: ${configuredModel}${probe.reason ? ` (${probe.reason})` : ""}`);
        return null;
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

    const candidateModels = lines.flatMap((line) => {
        if (/^name\s+/i.test(line)) {
            return [];
        }

        const modelName = line.split(/\s+/)[0];
        return MODEL_CANDIDATE_PATTERNS.some((pattern) => pattern.test(modelName)) ? [modelName] : [];
    });

    const rejectedModels: string[] = [];

    for (const model of candidateModels) {
        const probe = await probeModelSupport(model);

        if (probe.supported) {
            return model;
        }

        rejectedModels.push(probe.reason ? `${model} (${probe.reason})` : model);
    }

    if (candidateModels.length === 0) {
        console.warn("No suitable Ollama model found.");
    } else {
        console.warn(`No OpenCode tool-capable Ollama model found among candidates: ${rejectedModels.join(", ")}`);
    }

    return null;
}

async function supportsOpenCodeTools(model: string): Promise<boolean> {
    const probe = await probeModelSupport(model);
    return probe.supported;
}

async function probeModelSupport(model: string): Promise<ModelProbeResult> {
    const repoPath = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-model-probe-"));

    try {
        await initializeRepository(repoPath);
        await writeOpenCodeConfig(repoPath, model);

        const result = await execa(
            "opencode",
            [
                "run",
                "--format",
                "json",
                "--agent",
                "build",
                "Write a file named probe.txt in the repository root containing exactly OK."
            ],
            {
                cwd: repoPath,
                reject: false,
                stdin: "ignore",
                stdout: "pipe",
                stderr: "pipe"
            }
        );

        const output = `${result.stdout}\n${result.stderr}`;
        const debugExcerpt = buildProbeDebugExcerpt(output);

        if (/does not support tools/i.test(output)) {
            return {
                supported: false,
                reason: `provider reported that the model does not support tools; ${debugExcerpt}`
            };
        }

        if (result.exitCode !== 0) {
            return {
                supported: false,
                reason: `probe exited with code ${result.exitCode}; ${debugExcerpt}`
            };
        }

        const probePath = path.join(repoPath, "probe.txt");

        try {
            await fs.access(probePath);
            return {
                supported: true
            };
        } catch {
            if (emittedFileWriteToolCall(output)) {
                return {
                    supported: true
                };
            }

            return {
                supported: false,
                reason: `probe completed but did not create probe.txt; ${debugExcerpt}`
            };
        }
    } catch {
        return {
            supported: false,
            reason: "probe execution threw an unexpected error"
        };
    } finally {
        await fs.rm(repoPath, { recursive: true, force: true });
    }
}

async function initializeRepository(repoPath: string): Promise<void> {
    await execa("git", ["init", "-b", "main"], { cwd: repoPath });
    await execa("git", ["config", "user.name", "OpenCode Runner Test"], { cwd: repoPath });
    await execa("git", ["config", "user.email", "opencode-runner-test@example.com"], { cwd: repoPath });
    await fs.writeFile(
        path.join(repoPath, "package.json"),
        JSON.stringify({ name: "opencode-runner-test", version: "0.0.0", private: true }, null, 2)
    );
    await fs.mkdir(path.join(repoPath, "src"), { recursive: true });
    await fs.writeFile(path.join(repoPath, "src", "index.json"), JSON.stringify({ initialized: true }, null, 2));
    await fs.writeFile(
        path.join(repoPath, "index.js"),
        [
            "function main() {",
            "}",
            "",
            "main();",
            ""
        ].join("\n")
    );
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
