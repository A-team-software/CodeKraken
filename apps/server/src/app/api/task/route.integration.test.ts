import fs from "node:fs/promises";
import path from "node:path";

import { execa } from "execa";
import { NextRequest } from "next/server";
import { afterEach, expect, test, type TestContext } from "vitest";

async function isCommandAvailable(command: string): Promise<boolean> {
    try {
        await execa(command, ["--version"]);
        return true;
    } catch {
        return false;
    }
}

function restoreEnv(previousEnv: NodeJS.ProcessEnv): void {
    for (const key of Object.keys(process.env)) {
        if (!(key in previousEnv)) {
            delete process.env[key];
        }
    }

    for (const [key, value] of Object.entries(previousEnv)) {
        if (typeof value === "undefined") {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

function getGithubHeaders(token: string): Record<string, string> {
    return {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "vitest-integration-test",
        "X-GitHub-Api-Version": "2022-11-28"
    };
}

async function pollForGithubPR(
    owner: string,
    repo: string,
    headBranch: string,
    token: string,
    timeoutMs = 120_000,
    intervalMs = 5_000
): Promise<any> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${encodeURIComponent(headBranch)}`,
            {
                headers: getGithubHeaders(token)
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to poll GitHub PRs: ${response.status} ${response.statusText}`);
        }

        const pullRequests = (await response.json()) as any[];
        if (pullRequests.length > 0) {
            return pullRequests[0];
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timed out waiting for PR for branch "${headBranch}"`);
}

async function fetchGithubPRFiles(
    owner: string,
    repo: string,
    pullNumber: number,
    token: string
): Promise<any[]> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files`, {
        headers: getGithubHeaders(token)
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch GitHub PR files: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as any[];
}

async function closeGithubPR(owner: string, repo: string, pullNumber: number, token: string): Promise<void> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`, {
        method: "PATCH",
        headers: {
            ...getGithubHeaders(token),
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ state: "closed" })
    });

    if (!response.ok) {
        throw new Error(`Failed to close GitHub PR #${pullNumber}: ${response.status} ${response.statusText}`);
    }
}

async function deleteGithubBranch(owner: string, repo: string, branch: string, token: string): Promise<void> {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`,
        {
            method: "DELETE",
            headers: getGithubHeaders(token)
        }
    );

    if (response.status === 404 || response.status === 422) {
        return;
    }

    if (!response.ok) {
        throw new Error(`Failed to delete GitHub branch "${branch}": ${response.status} ${response.statusText}`);
    }
}

import { POST } from "./route";

const TEST_TIMEOUT_MS = 10 * 60 * 1000;
const PUBLIC_FIBONNACY_REPO_URL = "https://github.com/hervinhio/fibonacci";
const GITHUB_REPO_OWNER = "hervinhio";
const GITHUB_REPO_NAME = "fibonacci";

const serverRoot = path.resolve(process.cwd());
const volumeRoot = path.join(serverRoot, "test_volumes");
const createdDirs: string[] = [];
const createdRemoteBranches: string[] = [];

const dockerAvailable = await isCommandAvailable("docker");
const taskRunnerIntegrationTestEnabled =
    process.env.TEST_ENABLE_TASK_RUNNER_INTEGRATION_TESTS === "true" ||
    process.env.TEST_ENABLE_INTEGRATION_TESTS === "true";
const integrationTest = dockerAvailable && taskRunnerIntegrationTestEnabled ? test : test.skip;
const prIntegrationTestEnabled = process.env.TEST_ENABLE_PR_INTEGRATION_TEST === "true";
const prIntegrationTest = dockerAvailable && prIntegrationTestEnabled ? test : test.skip;

const githubToken = process.env.TEST_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GIT_TOKEN ?? "";
const githubUser = process.env.TEST_GITHUB_USER ?? process.env.TEST_GITHUB_USERNAME ?? "";

afterEach(async () => {
    for (const dir of createdDirs.splice(0, createdDirs.length)) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch {
            // Docker may create root-owned files in mounted volumes; cleanup is best-effort.
        }
    }

    if (githubToken.length === 0) {
        return;
    }

    for (const branch of createdRemoteBranches.splice(0, createdRemoteBranches.length)) {
        try {
            await deleteGithubBranch(GITHUB_REPO_OWNER, GITHUB_REPO_NAME, branch, githubToken);
        } catch {
            // Best-effort cleanup of remote test branches.
        }
    }
});

integrationTest("POST /api/task handles Jira Forge issue created webhook and implements fibonnacy", { timeout: TEST_TIMEOUT_MS }, async (_ctx: TestContext) => {
    await fs.mkdir(volumeRoot, { recursive: true });

    const workspaceHostPath = await fs.mkdtemp(path.join(volumeRoot, "jira-forge-it-"));
    createdDirs.push(workspaceHostPath);

    const originalEnv = {
        OPENCODE_DOCKER_WORKSPACE_HOST_DIR: process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR
    };

    process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR = workspaceHostPath;

    try {
        const request = new NextRequest("http://localhost:3000/api/task?provider=jira", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-atlassian-webhook-identifier": "forge-test-webhook",
                "x-forge-account-id": "forge-account-1",
                "x-forge-client-key": "forge-client-1"
            },
            body: JSON.stringify({
                repoUrl: PUBLIC_FIBONNACY_REPO_URL,
                webhookEvent: "jira:issue_created",
                issue: {
                    id: "10001",
                    key: "PROJ-1",
                    fields: {
                        summary: "Implement fibonnacy in src/index.js",
                        description: [
                            "Update src/index.js.",
                            "Implement exactly one function named fibonnacy.",
                            "The exported function must be fibonnacy.",
                            "For n >= 0, fibonnacy(0)=0 and fibonnacy(1)=1.",
                            "Do not define a function named fibonacci.",
                            "Keep module export working from src/index.js."
                        ].join(" "),
                        issuetype: {
                            id: "1",
                            name: "Task"
                        }
                    }
                }
            })
        });

        const response = await POST(request);
        const payload = await response.json() as {
            success?: boolean;
            message?: string;
            error?: string;
            data?: { stdout?: string; stderr?: string };
        };

        expect(response.status, payload.error ?? payload.message ?? "task endpoint failed").toBe(200);
        expect(payload.success, payload.error ?? payload.message ?? "task processing failed").toBe(true);

        const generatedRepoPath = path.join(workspaceHostPath, "app");
        const indexPath = path.join(generatedRepoPath, "src", "index.js");
        const indexSource = await fs.readFile(indexPath, "utf8");

        expect(indexSource).toMatch(/function\s+fibonnacy\s*\(/);
        expect(indexSource).not.toMatch(/function\s+fibonacci\s*\(/);

        const verifyRun = await execa(
            "node",
            [
                "-e",
                [
                    "const fibonnacy = require('./src/index');",
                    "if (typeof fibonnacy !== 'function') throw new Error('export is not a function');",
                    "if (fibonnacy.name !== 'fibonnacy') throw new Error('function name is not fibonnacy');",
                    "if (fibonnacy(0) !== 0) throw new Error('fibonnacy(0) mismatch');",
                    "if (fibonnacy(1) !== 1) throw new Error('fibonnacy(1) mismatch');",
                    "if (fibonnacy(6) !== 8) throw new Error('fibonnacy(6) mismatch');",
                    "console.log('fibonnacy verification passed');"
                ].join(" ")
            ],
            {
                cwd: generatedRepoPath,
                reject: false,
                stdout: "pipe",
                stderr: "pipe"
            }
        );

        expect(verifyRun.exitCode, verifyRun.stderr || verifyRun.stdout).toBe(0);
    } finally {
        restoreEnv(originalEnv);
    }
});

prIntegrationTest("POST /api/task creates GitHub PR with valid fibonnacy implementation", { timeout: TEST_TIMEOUT_MS }, async (_ctx: TestContext) => {
    await fs.mkdir(volumeRoot, { recursive: true });

    const testBranch = `test/fibonnacy-${Date.now()}`;
    createdRemoteBranches.push(testBranch);

    const workspaceHostPath = await fs.mkdtemp(path.join(volumeRoot, "jira-forge-pr-it-"));
    createdDirs.push(workspaceHostPath);

    const originalEnv = {
        OPENCODE_DOCKER_WORKSPACE_HOST_DIR: process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GIT_TOKEN: process.env.GIT_TOKEN,
        GIT_USERNAME: process.env.GIT_USERNAME
    };
    process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR = workspaceHostPath;
    if (githubToken.length > 0) {
        process.env.GITHUB_TOKEN = githubToken;
        process.env.GIT_TOKEN = githubToken;
        if (githubUser.length > 0) {
            process.env.GIT_USERNAME = githubUser;
        }
    } else {
        delete process.env.GITHUB_TOKEN;
        delete process.env.GIT_TOKEN;
        delete process.env.GIT_USERNAME;
    }

    let createdPrNumber: number | undefined;

    try {
        const request = new NextRequest("http://localhost:3000/api/task?provider=jira", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-atlassian-webhook-identifier": "forge-pr-test-webhook",
                "x-forge-account-id": "forge-account-pr",
                "x-forge-client-key": "forge-client-pr"
            },
            body: JSON.stringify({
                repoUrl: PUBLIC_FIBONNACY_REPO_URL,
                branch: testBranch,
                webhookEvent: "jira:issue_created",
                issue: {
                    id: "10002",
                    key: "PROJ-2",
                    fields: {
                        summary: "Implement fibonnacy in src/index.js",
                        description: [
                            "Update src/index.js.",
                            "Implement exactly one function named fibonnacy.",
                            "The exported function must be fibonnacy.",
                            "For n >= 0, fibonnacy(0)=0 and fibonnacy(1)=1.",
                            "Do not define a function named fibonacci.",
                            "Keep module export working from src/index.js."
                        ].join(" "),
                        issuetype: { id: "1", name: "Task" }
                    }
                }
            })
        });

        const response = await POST(request);
        const payload = await response.json() as {
            success?: boolean;
            message?: string;
            error?: string;
            data?: { stdout?: string; stderr?: string };
        };

        expect(response.status, payload.error ?? payload.message ?? "task endpoint failed").toBe(200);
        expect(payload.success, payload.error ?? payload.message ?? "task processing failed").toBe(true);

        if (githubToken.length === 0) {
            // Public repositories can still be cloned and processed without authentication.
            // In no-token mode, we only verify the job succeeded and produced code changes.
            const generatedRepoPath = path.join(workspaceHostPath, "app");
            const indexPath = path.join(generatedRepoPath, "src", "index.js");
            const indexSource = await fs.readFile(indexPath, "utf8");

            expect(indexSource).toMatch(/function\s+fibonnacy\s*\(/);
            expect(indexSource).not.toMatch(/function\s+fibonacci\s*\(/);
            return;
        }

        // Find the PR created by headstart.sh for our branch.
        const pr = await pollForGithubPR(
            GITHUB_REPO_OWNER,
            GITHUB_REPO_NAME,
            testBranch,
            githubToken,
            { maxAttempts: 10, intervalMs: 3000 }
        );
        expect(pr, `No open PR found on GitHub for branch '${testBranch}'`).toBeDefined();
        createdPrNumber = pr!.number;

        // Verify the PR diff contains a valid fibonnacy implementation.
        const prFiles = await fetchGithubPRFiles(
            GITHUB_REPO_OWNER,
            GITHUB_REPO_NAME,
            pr!.number,
            githubToken
        );

        const combinedPatches = prFiles
            .filter((f: { patch?: string }) => typeof f.patch === "string")
            .map((f: { patch?: string }) => f.patch as string)
            .join("\n");

        expect(combinedPatches, "PR diff should contain fibonnacy function definition").toMatch(/function\s+fibonnacy\s*\(/);
    } finally {
        restoreEnv(originalEnv);
        // Close the PR if it was created.
        if (githubToken.length > 0 && createdPrNumber !== undefined) {
            try {
                await closeGithubPR(GITHUB_REPO_OWNER, GITHUB_REPO_NAME, createdPrNumber, githubToken);
            } catch {
                // Best-effort.
            }
        }
    }
});

