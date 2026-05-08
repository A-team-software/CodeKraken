import fs from "node:fs/promises";
import path from "node:path";

import { MongoConfigPersistenceLayer } from "@/brain/runner/mongo-config-persistence-layer";
import { JobDocument, JobStep } from "@/brain/runner/job-persistence-layer";
import { MongoJobPersistenceLayer } from "@/brain/runner/mongo-job-persistence-layer";
import { execa } from "execa";
import { NextRequest } from "next/server";
import { afterEach, expect, test, type TestContext, vi } from "vitest";

import {
    closeGithubPR,
    closeOpenPRsForBranch,
    deleteGithubBranch,
    fetchGithubPRFiles,
    getGithubPR,
    githubApiRequest,
    isCommandAvailable,
    mergeGithubPR,
    parseGitHubRepoUrl,
    pollForGithubPR,
    restoreEnv
} from "./test-utils/integration-helpers";
import { POST as postMergedWebhook } from "../webhooks/pr/merged/route";
import { PATCH, POST } from "./route";

const TEST_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_TEST_REPO_URL = "https://github.com/hervinhio/test-repo.git";
const TEST_REPO_URL = process.env.TEST_INCREMENTAL_PR_REPO_URL?.trim() || DEFAULT_TEST_REPO_URL;
const DEFAULT_REPO_RESET_ALLOWLIST = "hervinhio/test-repo";
const TEST_CLIENT_KEY = "forge-client-incremental-pr";
const TODO_ONE_ID = "TODO-1";
const TODO_TWO_ID = "TODO-2";

const INCREMENTAL_PLAN = [
    "# Incremental implementation plan",
    "todos:",
    `  - id: ${TODO_ONE_ID}`,
    "    content: Implement fibonacci function in src/index.js and create PR.md (first line PR title, blank line, then PR description)",
    "    status: pending",
    `  - id: ${TODO_TWO_ID}`,
    "    content: Implement factorial function in src/index.js and update PR.md for this second change set",
    "    status: pending"
].join("\n");

interface InMemoryJobRecord {
    id: string;
    config?: Record<string, unknown>;
    result?: Record<string, unknown> | null;
    plan?: string;
    steps: JobStep[];
    isIncremental: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const inMemoryJobs = new Map<string, InMemoryJobRecord>();

const { owner: githubRepoOwner, name: githubRepoName } = parseGitHubRepoUrl(TEST_REPO_URL);

const serverRoot = path.resolve(process.cwd());
const volumeRoot = path.join(serverRoot, "test_volumes");
const createdDirs: string[] = [];
const createdRemoteBranches: string[] = [];
const createdPrsByRepo = new Map<string, number[]>();

const dockerAvailable = await isCommandAvailable("docker");
const prIntegrationTestEnabled = process.env.TEST_ENABLE_PR_INTEGRATION_TEST === "true";
const incrementalPrIntegrationEnabled = process.env.TEST_ENABLE_INCREMENTAL_PR_INTEGRATION_TEST === "true";
const githubToken = process.env.TEST_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GIT_TOKEN ?? "";
const githubUser = process.env.TEST_GITHUB_USER ?? process.env.TEST_GITHUB_USERNAME ?? "";
const incrementalIntegrationTest = dockerAvailable && prIntegrationTestEnabled && incrementalPrIntegrationEnabled && githubToken.length > 0
    ? test
    : test.skip;

afterEach(async () => {
    for (const dir of createdDirs.splice(0, createdDirs.length)) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch {
            // Docker may create root-owned files in mounted volumes; cleanup is best-effort.
        }
    }

    const prs = createdPrsByRepo.get(`${githubRepoOwner}/${githubRepoName}`) ?? [];
    createdPrsByRepo.delete(`${githubRepoOwner}/${githubRepoName}`);

    for (const prNumber of prs) {
        try {
            await closeGithubPR(githubRepoOwner, githubRepoName, prNumber, githubToken);
        } catch {
            // Best-effort cleanup of test PRs.
        }
    }

    for (const branch of createdRemoteBranches.splice(0, createdRemoteBranches.length)) {
        try {
            await deleteGithubBranch(githubRepoOwner, githubRepoName, branch, githubToken);
        } catch {
            // Best-effort cleanup of remote test branches.
        }
    }

    try {
        await emptyGithubRepository(githubRepoOwner, githubRepoName, githubToken);
    } catch {
        // Best-effort repository reset for the dedicated test repository.
    }

    vi.restoreAllMocks();
    inMemoryJobs.clear();
});

incrementalIntegrationTest("incremental PR flow runs plan, first todo, and second todo via merged webhook", { timeout: TEST_TIMEOUT_MS }, async (_ctx: TestContext) => {
    await fs.mkdir(volumeRoot, { recursive: true });

    const timestamp = Date.now();
    const issueId = `inc-${timestamp}`;
    const branch = `test/incremental-pr-${timestamp}`;
    const workspaceHostPath = await fs.mkdtemp(path.join(volumeRoot, "jira-forge-incremental-pr-it-"));

    createdDirs.push(workspaceHostPath);
    createdRemoteBranches.push(branch);

    const originalEnv = {
        OPENCODE_DOCKER_WORKSPACE_HOST_DIR: process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR,
        OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED: process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GIT_TOKEN: process.env.GIT_TOKEN,
        GIT_USERNAME: process.env.GIT_USERNAME
    };

    process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR = workspaceHostPath;
    process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED = "true";
    process.env.GITHUB_TOKEN = githubToken;
    process.env.GIT_TOKEN = githubToken;
    if (githubUser.length > 0) {
        process.env.GIT_USERNAME = githubUser;
    }

    const tenantConfigSpy = vi.spyOn(MongoConfigPersistenceLayer.prototype, "getTenantConfig");
    tenantConfigSpy.mockResolvedValue({ incrementalPrsOn: true });

    const saveJobSpy = vi.spyOn(MongoJobPersistenceLayer.prototype, "saveJob");
    saveJobSpy.mockImplementation(async (jobId, data) => {
        const now = new Date();
        const existing = inMemoryJobs.get(jobId);
        const isIncremental = data.isIncremental !== undefined
            ? data.isIncremental
            : existing?.isIncremental ?? false;
        const steps = existing ? [...existing.steps] : [];
        const effectiveTodoItemId = data.todoItemId ?? (data.plan !== undefined && !data.prId ? "plan" : undefined);

        const record: InMemoryJobRecord = {
            id: jobId,
            config: data.config !== undefined ? (data.config as unknown as Record<string, unknown>) : existing?.config,
            result: data.result !== undefined ? (data.result as Record<string, unknown> | null) : existing?.result,
            plan: data.plan !== undefined ? data.plan : existing?.plan,
            isIncremental,
            steps,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now
        };

        if (data.result && typeof data.result === "object") {
            const nextStep: JobStep = {
                ...(effectiveTodoItemId ? { todoItemId: effectiveTodoItemId } : {}),
                result: data.result,
                ...(data.prId ? { prId: data.prId } : {}),
                createdAt: now,
                updatedAt: now
            };

            if (record.isIncremental) {
                if (effectiveTodoItemId) {
                    const existingIndex = record.steps.findIndex((step) => step.todoItemId === effectiveTodoItemId);
                    if (existingIndex >= 0) {
                        const existingStep = record.steps[existingIndex];
                        record.steps[existingIndex] = {
                            ...existingStep,
                            result: data.result,
                            ...(data.prId ? { prId: data.prId } : {}),
                            updatedAt: now
                        };
                    } else {
                        record.steps.push(nextStep);
                    }
                } else {
                    record.steps.push(nextStep);
                }
            } else {
                record.steps = [nextStep];
            }
        }

        inMemoryJobs.set(jobId, record);
    });

    const getJobSpy = vi.spyOn(MongoJobPersistenceLayer.prototype, "getJob");
    getJobSpy.mockImplementation(async (jobId: string) => {
        const record = inMemoryJobs.get(jobId);
        return toJobDocument(record);
    });

    const findLatestByPrSpy = vi.spyOn(MongoJobPersistenceLayer.prototype, "findLatestJobByPrId");
    findLatestByPrSpy.mockImplementation(async (prId: string) => {
        const candidates = [...inMemoryJobs.values()]
            .filter((record) => record.steps.some((step) => step.prId === prId))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return toJobDocument(candidates[0]);
    });

    try {
        const startRequest = new NextRequest("http://localhost:3000/api/task?provider=jira", {
            method: "POST",
            headers: buildTaskApiHeaders({
                "content-type": "application/json",
                "x-atlassian-webhook-identifier": "forge-incremental-pr-webhook",
                "x-forge-account-id": "forge-account-incremental-pr",
                "x-forge-client-key": TEST_CLIENT_KEY
            }),
            body: JSON.stringify({
                repoUrl: TEST_REPO_URL,
                branch,
                mode: "plan",
                webhookEvent: "jira:issue_created",
                issue: {
                    id: issueId,
                    key: `INC-${timestamp}`,
                    fields: {
                        summary: "Create an incremental implementation plan for fibonacci and factorial",
                        description: [
                            "Create a plan with exactly two todo items.",
                            "Todo 1: implement fibonacci in src/index.js.",
                            "Todo 2: implement factorial in src/index.js.",
                            "Do not complete implementation in this first step."
                        ].join(" "),
                        issuetype: { id: "1", name: "Task" }
                    }
                }
            })
        });

        const startResponse = await POST(startRequest);
        const startPayload = await startResponse.json() as { success?: boolean; error?: string; message?: string };

        expect(startResponse.status, startPayload.error ?? startPayload.message ?? "initial task start failed").toBe(200);
        expect(startPayload.success, startPayload.error ?? startPayload.message ?? "initial task start failed").toBe(true);

        await closeOpenPRsForBranch(githubRepoOwner, githubRepoName, branch, githubToken);

        const persistPlanRequest = new NextRequest(`http://localhost:3000/api/task?jobId=${encodeURIComponent(issueId)}`, {
            method: "PATCH",
            headers: buildTaskApiHeaders({ "content-type": "application/json" }),
            body: JSON.stringify({
                plan: INCREMENTAL_PLAN,
                todoItemId: "plan"
            })
        });

        const persistPlanResponse = await PATCH(persistPlanRequest);
        const persistPlanPayload = await persistPlanResponse.json() as { success?: boolean; error?: string };
        expect(persistPlanResponse.status, persistPlanPayload.error ?? "failed to persist plan").toBe(200);
        expect(persistPlanPayload.success, persistPlanPayload.error ?? "failed to persist plan").toBe(true);

        const firstPr = await pollForGithubPR(
            githubRepoOwner,
            githubRepoName,
            branch,
            githubToken,
            { maxAttempts: 20, intervalMs: 5000 }
        );

        expect(firstPr, `No first PR found for branch '${branch}' after persisting plan.`).toBeDefined();
        const firstPrNumber = firstPr!.number;
        trackPrForCleanup(githubRepoOwner, githubRepoName, firstPrNumber);

        const firstPrFiles = await fetchGithubPRFiles(githubRepoOwner, githubRepoName, firstPrNumber, githubToken);
        const firstPatch = joinPatches(firstPrFiles);
        expect(firstPatch, "First PR must include fibonacci implementation changes.").toMatch(/fibo/i);

        const persistFirstPrRequest = new NextRequest(`http://localhost:3000/api/task?jobId=${encodeURIComponent(issueId)}`, {
            method: "PATCH",
            headers: buildTaskApiHeaders({ "content-type": "application/json" }),
            body: JSON.stringify({
                prId: String(firstPrNumber),
                todoItemId: TODO_ONE_ID
            })
        });

        const persistFirstPrResponse = await PATCH(persistFirstPrRequest);
        const persistFirstPrPayload = await persistFirstPrResponse.json() as { success?: boolean; error?: string };
        expect(persistFirstPrResponse.status, persistFirstPrPayload.error ?? "failed to persist first PR id").toBe(200);
        expect(persistFirstPrPayload.success, persistFirstPrPayload.error ?? "failed to persist first PR id").toBe(true);

        const mergeResponse = await mergeGithubPR(githubRepoOwner, githubRepoName, firstPrNumber, githubToken);
        expect(
            mergeResponse.merged,
            `Failed to auto-merge first PR #${firstPrNumber}: ${mergeResponse.message || "unknown merge error"}`
        ).toBe(true);

        const mergedPrDetails = await getGithubPR(githubRepoOwner, githubRepoName, firstPrNumber, githubToken);

        const webhookRequest = new NextRequest("http://localhost:3000/api/webhooks/pr/merged?provider=github", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-forge-client-key": TEST_CLIENT_KEY
            },
            body: JSON.stringify({
                action: "closed",
                pull_request: {
                    number: firstPrNumber,
                    title: mergedPrDetails.title,
                    body: mergedPrDetails.body,
                    merged: true
                }
            })
        });

        const webhookResponse = await postMergedWebhook(webhookRequest);
        const webhookPayload = await webhookResponse.json() as { success?: boolean; error?: string };

        expect(webhookResponse.status, webhookPayload.error ?? "merged PR webhook failed").toBe(200);
        expect(webhookPayload.success, webhookPayload.error ?? "merged PR webhook failed").toBe(true);

        const secondPr = await pollForGithubPR(
            githubRepoOwner,
            githubRepoName,
            branch,
            githubToken,
            { maxAttempts: 20, intervalMs: 5000, excludePrNumbers: [firstPrNumber] }
        );

        expect(secondPr, `No second PR found for branch '${branch}' after merged webhook for PR #${firstPrNumber}.`).toBeDefined();
        expect(secondPr!.number).not.toBe(firstPrNumber);

        trackPrForCleanup(githubRepoOwner, githubRepoName, secondPr!.number);

        const secondPrFiles = await fetchGithubPRFiles(githubRepoOwner, githubRepoName, secondPr!.number, githubToken);
        const secondPatch = joinPatches(secondPrFiles);
        expect(secondPatch, "Second PR must include factorial implementation changes.").toMatch(/factorial/i);
    } finally {
        restoreEnv(originalEnv);
    }
});

function trackPrForCleanup(owner: string, repo: string, prNumber: number): void {
    const key = `${owner}/${repo}`;
    const existing = createdPrsByRepo.get(key) ?? [];
    if (!existing.includes(prNumber)) {
        existing.push(prNumber);
    }
    createdPrsByRepo.set(key, existing);
}

function joinPatches(files: Array<{ patch?: string }>): string {
    return files
        .filter((file) => typeof file.patch === "string")
        .map((file) => file.patch as string)
        .join("\n");
}

function buildTaskApiHeaders(baseHeaders: Record<string, string>): Record<string, string> {
    const taskApiToken = process.env.OPENCODE_TASK_API_TOKEN || process.env.TASK_API_TOKEN || process.env.API_KEY || "";
    if (!taskApiToken) {
        return baseHeaders;
    }

    return {
        ...baseHeaders,
        authorization: `Bearer ${taskApiToken}`
    };
}

async function emptyGithubRepository(owner: string, repo: string, token: string): Promise<void> {
    const allowReset = process.env.TEST_ALLOW_GITHUB_REPO_RESET?.trim().toLowerCase() === "true";
    if (!allowReset) {
        throw new Error("Refusing to reset repository: set TEST_ALLOW_GITHUB_REPO_RESET=true to enable destructive cleanup.");
    }

    const allowlist = (process.env.TEST_GITHUB_REPO_RESET_ALLOWLIST || DEFAULT_REPO_RESET_ALLOWLIST)
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
    const repoKey = `${owner}/${repo}`.toLowerCase();
    if (!allowlist.includes(repoKey)) {
        throw new Error(`Refusing to reset repository '${owner}/${repo}': not present in TEST_GITHUB_REPO_RESET_ALLOWLIST.`);
    }

    if (!token) {
        throw new Error("Refusing to reset repository without a GitHub token.");
    }

    const metadataResponse = await githubApiRequest(`/repos/${owner}/${repo}`, token);
    if (!metadataResponse.ok) {
        throw new Error(`Failed to load repository metadata for ${owner}/${repo}: HTTP ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json() as { default_branch?: string };
    const defaultBranch = metadata.default_branch?.trim();
    if (!defaultBranch) {
        throw new Error(`Missing default branch for ${owner}/${repo}.`);
    }

    const cleanupDir = await fs.mkdtemp(path.join(volumeRoot, "repo-empty-it-"));

    try {
        await execa("git", ["clone", `https://x-access-token:${token}@github.com/${owner}/${repo}.git`, cleanupDir], {
            reject: true,
            stdout: "pipe",
            stderr: "pipe"
        });

        await execa("git", ["config", "user.name", "Oliver Test Cleanup"], { cwd: cleanupDir });
        await execa("git", ["config", "user.email", "oliver-test-cleanup@example.com"], { cwd: cleanupDir });
        await execa("git", ["checkout", defaultBranch], { cwd: cleanupDir });
        await execa("sh", ["-lc", "find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +"], { cwd: cleanupDir });

        const status = await execa("git", ["status", "--porcelain"], {
            cwd: cleanupDir,
            reject: true,
            stdout: "pipe",
            stderr: "pipe"
        });

        if (status.stdout.trim().length === 0) {
            return;
        }

        await execa("git", ["add", "-A"], { cwd: cleanupDir });
        await execa("git", ["commit", "-m", "test: reset repository contents to empty"], { cwd: cleanupDir });
        await execa("git", ["push", "origin", `HEAD:${defaultBranch}`], { cwd: cleanupDir });
    } finally {
        await fs.rm(cleanupDir, { recursive: true, force: true });
    }
}

function toJobDocument(record: InMemoryJobRecord | undefined): JobDocument | null {
    if (!record) {
        return null;
    }

    const latestResult = record.steps.length > 0
        ? record.steps[record.steps.length - 1]?.result
        : record.result;

    return {
        id: record.id,
        config: record.config as any,
        result: (latestResult as any) ?? null,
        plan: record.plan,
        steps: record.steps,
        isIncremental: record.isIncremental
    };
}
