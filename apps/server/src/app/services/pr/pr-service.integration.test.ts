import {
    closeGithubPR,
    deleteGithubBranch,
    githubApiRequest,
    parseGitHubRepoUrl,
    restoreEnv,
} from "@/app/api/task/test-utils/integration-helpers";
import { GitHubCodePlatformAdapter } from "@/app/adapters/github-code-platform-adapter";
import { PullRequestCommentPayload } from "@/app/services/pr/comment-payload-adapter";
import { PullRequestServiceImpl } from "@/app/services/pr/pr-service";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const TEST_TIMEOUT_MS = 8 * 60 * 1000;
const PUBLIC_FIBONNACY_REPO_URL = "https://github.com/hervinhio/fibonacci";

const githubToken = process.env.TEST_GITHUB_TOKEN ?? process.env.GITHUB_TOKEN ?? process.env.GIT_TOKEN ?? "";
const prReviewIntegrationEnabled =
    process.env.TEST_ENABLE_PR_REVIEW_INTEGRATION_TEST === "true" ||
    process.env.TEST_ENABLE_PR_INTEGRATION_TEST === "true";

const reviewIntegrationTest = githubToken.length > 0 && prReviewIntegrationEnabled ? test : test.skip;
const { owner: repoOwner, name: repoName } = parseGitHubRepoUrl(PUBLIC_FIBONNACY_REPO_URL);

type CreatedPr = {
    number: number;
    branch: string;
    filePath: string;
};

class RecordingRunner {
    public readonly starts: Array<{
        repoUrl: string;
        mode: string;
        task: string;
        branch: string;
        vars: Record<string, unknown>;
    }> = [];

    async start(input: {
        repoUrl: string;
        mode: string;
        task: string;
        branch: string;
        vars: Record<string, unknown>;
    }): Promise<{ success: boolean; message: string }> {
        this.starts.push(input);
        return { success: true, message: "started" };
    }

    async startNextIteration(): Promise<{ success: boolean; message: string }> {
        return { success: true, message: "next" };
    }

    async stop(): Promise<{ success: boolean; message: string }> {
        return { success: true, message: "stopped" };
    }

    async pause(): Promise<{ success: boolean; message: string }> {
        return { success: true, message: "paused" };
    }

    async resume(): Promise<{ success: boolean; message: string }> {
        return { success: true, message: "resumed" };
    }

    async saveJob(): Promise<void> {
        return;
    }
}

const createdPrs: Array<{ number: number; branch: string }> = [];
const ORIGINAL_ENV = { ...process.env };

function uniqueBranch(prefix: string): string {
    return `test/${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}

async function expectOk(response: Response, context: string): Promise<void> {
    if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`${context} failed with ${response.status}: ${body}`);
    }
}

async function fetchMainSha(): Promise<string> {
    const response = await githubApiRequest(`/repos/${repoOwner}/${repoName}/git/ref/heads/main`, githubToken);
    await expectOk(response, "Fetch main ref");
    const payload = (await response.json()) as { object?: { sha?: string } };
    const sha = payload.object?.sha?.trim();
    if (!sha) {
        throw new Error("Main branch SHA is missing in GitHub response.");
    }

    return sha;
}

async function createBranchFromMain(branch: string): Promise<void> {
    const sha = await fetchMainSha();
    const response = await githubApiRequest(`/repos/${repoOwner}/${repoName}/git/refs`, githubToken, {
        method: "POST",
        body: JSON.stringify({
            ref: `refs/heads/${branch}`,
            sha,
        }),
    });
    await expectOk(response, `Create branch ${branch}`);
}

async function commitFileOnBranch(branch: string, filePath: string, content: string): Promise<void> {
    const response = await githubApiRequest(
        `/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(filePath)}`,
        githubToken,
        {
            method: "PUT",
            body: JSON.stringify({
                message: `test: add ${filePath}`,
                content: Buffer.from(content, "utf8").toString("base64"),
                branch,
            }),
        }
    );
    await expectOk(response, `Commit ${filePath} on ${branch}`);
}

async function createPrForBranch(branch: string, title: string, body: string): Promise<number> {
    const response = await githubApiRequest(`/repos/${repoOwner}/${repoName}/pulls`, githubToken, {
        method: "POST",
        body: JSON.stringify({
            title,
            head: branch,
            base: "main",
            body,
        }),
    });
    await expectOk(response, `Create PR for ${branch}`);
    const payload = (await response.json()) as { number?: number };
    if (typeof payload.number !== "number") {
        throw new Error("PR number missing from create PR response.");
    }

    return payload.number;
}

async function createRealPr(prefix: string): Promise<CreatedPr> {
    const branch = uniqueBranch(prefix);
    const filePath = `integration/pr-review-${Date.now()}.md`;
    const content = [
        "Line 1: PR review integration test.",
        "Line 2: This line is intended for review comments.",
        "Line 3: End of file.",
    ].join("\n");

    await createBranchFromMain(branch);
    await commitFileOnBranch(branch, filePath, content);

    const prNumber = await createPrForBranch(
        branch,
        `test: review flow ${prefix}`,
        "Automated integration test PR for onPullRequestReviewed"
    );

    createdPrs.push({ number: prNumber, branch });
    return { number: prNumber, branch, filePath };
}

async function createRequestedChangesReviewWithCodeComment(prNumber: number, filePath: string): Promise<void> {
    const response = await githubApiRequest(
        `/repos/${repoOwner}/${repoName}/pulls/${prNumber}/reviews`,
        githubToken,
        {
            method: "POST",
            body: JSON.stringify({
                event: "REQUEST_CHANGES",
                body: "Please update this code.",
                comments: [
                    {
                        path: filePath,
                        line: 2,
                        side: "RIGHT",
                        body: "Adjust this line to satisfy requested changes.",
                    },
                ],
            }),
        }
    );
    await expectOk(response, `Create requested-changes review for PR #${prNumber}`);
}

async function listIssueCommentBodies(prNumber: number): Promise<string[]> {
    const response = await githubApiRequest(
        `/repos/${repoOwner}/${repoName}/issues/${prNumber}/comments?per_page=100`,
        githubToken
    );
    await expectOk(response, `List comments for PR #${prNumber}`);

    const comments = (await response.json()) as Array<{ body?: string }>;
    return comments.map((comment) => comment.body ?? "");
}

async function expectNewCommentContaining(
    prNumber: number,
    baselineCount: number,
    expectedSubstring: string,
    maxAttempts = 10,
    intervalMs = 1500
): Promise<void> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const bodies = await listIssueCommentBodies(prNumber);
        if (bodies.length > baselineCount && bodies.some((body) => body.includes(expectedSubstring))) {
            return;
        }

        if (attempt < maxAttempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, intervalMs));
        }
    }

    const finalBodies = await listIssueCommentBodies(prNumber);
    throw new Error(
        `Expected a new comment containing '${expectedSubstring}' on PR #${prNumber}, but got comments: ${JSON.stringify(finalBodies)}`
    );
}

function createService(options?: {
    isIncremental?: boolean;
    runner?: RecordingRunner;
}): { service: PullRequestServiceImpl; runner: RecordingRunner } {
    const runner = options?.runner ?? new RecordingRunner();
    const jobPersistenceLayer = {
        findLatestJobByPrId: async () => ({
            isIncremental: options?.isIncremental === true,
        }),
        saveJob: async () => undefined,
        getJob: async () => undefined,
        deleteJob: async () => undefined,
    };

    const configPersistenceLayer = {
        getTenantConfig: async () => ({ incrementalPrsOn: false }),
    };

    const commentJobBufferPersistenceLayer = {
        bufferComment: async () => undefined,
        findUnprocessedBuffersOlderThan: async () => [],
        markProcessed: async () => undefined,
    };

    const service = new PullRequestServiceImpl(
        runner as never,
        configPersistenceLayer as never,
        commentJobBufferPersistenceLayer as never,
        jobPersistenceLayer as never
    );

    return { service, runner };
}

beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.GITHUB_TOKEN = githubToken;
    process.env.GITHUB_REPO_OWNER = repoOwner;
    process.env.GITHUB_REPO_NAME = repoName;
    process.env.OPENCODE_TASK_REPO_URL = PUBLIC_FIBONNACY_REPO_URL;
});

afterEach(async () => {
    restoreEnv(ORIGINAL_ENV);

    for (const pr of createdPrs.splice(0, createdPrs.length)) {
        try {
            await closeGithubPR(repoOwner, repoName, pr.number, githubToken);
        } catch {
            // Best-effort cleanup.
        }

        try {
            await deleteGithubBranch(repoOwner, repoName, pr.branch, githubToken);
        } catch {
            // Best-effort cleanup.
        }
    }

    vi.restoreAllMocks();
});

reviewIntegrationTest(
    "onPullRequestReviewed posts incremental approval thank-you comment on a real PR",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
        const { number, branch } = await createRealPr("approved-incremental");
        const baseline = (await listIssueCommentBodies(number)).length;

        const { service } = createService({ isIncremental: true });
        await service.onPullRequestReviewed(
            { id: String(number), branch, status: "approved" },
            "github"
        );

        await expectNewCommentContaining(number, baseline, "incremental workflow can continue");
    }
);

reviewIntegrationTest(
    "onPullRequestReviewed posts non-incremental approval thank-you comment on a real PR",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
        const { number, branch } = await createRealPr("approved-normal");
        const baseline = (await listIssueCommentBodies(number)).length;

        const { service } = createService({ isIncremental: false });
        await service.onPullRequestReviewed(
            { id: String(number), branch, status: "approved" },
            "github"
        );

        await expectNewCommentContaining(number, baseline, "go ahead and merge this pull request");
    }
);

reviewIntegrationTest(
    "onPullRequestReviewed asks for detailed explanation when changes are requested and no unresolved comments exist",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
        const { number, branch } = await createRealPr("changes-no-comments");
        const baseline = (await listIssueCommentBodies(number)).length;

        const { service, runner } = createService();
        await service.onPullRequestReviewed(
            { id: String(number), branch, status: "changes_requested" },
            "github"
        );

        expect(runner.starts.length).toBe(0);
        await expectNewCommentContaining(number, baseline, "Could you provide a detailed explanation");
    }
);

reviewIntegrationTest(
    "onPullRequestReviewed asks for code-specific explanation when unresolved comments are non-code",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
        const { number, branch } = await createRealPr("changes-non-code");
        const baseline = (await listIssueCommentBodies(number)).length;

        const commentSpy = vi
            .spyOn(GitHubCodePlatformAdapter.prototype, "getPullRequestComments")
            .mockResolvedValueOnce([
                {
                    id: "synthetic-non-code",
                    prId: String(number),
                    body: "Please explain this change in more detail.",
                    author: "reviewer",
                    branch,
                    mentionedUsers: [],
                    resolved: false,
                } satisfies PullRequestCommentPayload,
            ]);

        const { service, runner } = createService();
        await service.onPullRequestReviewed(
            { id: String(number), branch, status: "changes_requested" },
            "github"
        );

        expect(commentSpy).toHaveBeenCalledOnce();
        expect(runner.starts.length).toBe(0);
        await expectNewCommentContaining(number, baseline, "code-specific explanation");
    }
);

reviewIntegrationTest(
    "onPullRequestReviewed starts runner when unresolved code comments exist after changes requested",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
        const { number, branch, filePath } = await createRealPr("changes-code");
        await createRequestedChangesReviewWithCodeComment(number, filePath);

        const { service, runner } = createService();
        await service.onPullRequestReviewed(
            { id: String(number), branch, status: "changes_requested" },
            "github"
        );

        expect(runner.starts.length).toBe(1);
        expect(runner.starts[0]).toEqual(
            expect.objectContaining({
                repoUrl: PUBLIC_FIBONNACY_REPO_URL,
                mode: "agent",
                branch,
                vars: expect.objectContaining({
                    prId: String(number),
                    platform: "github" satisfies PullRequestPlatform,
                    source: "pr-review-changes-requested",
                }),
                task: expect.stringContaining(filePath),
            })
        );
    }
);

reviewIntegrationTest(
    "onPullRequestReviewed returns early for rejected reviews without posting comments or starting runner",
    { timeout: TEST_TIMEOUT_MS },
    async () => {
        const { number, branch } = await createRealPr("rejected");
        const baseline = (await listIssueCommentBodies(number)).length;

        const { service, runner } = createService();
        await service.onPullRequestReviewed(
            { id: String(number), branch, status: "rejected" },
            "github"
        );

        expect(runner.starts.length).toBe(0);

        const after = await listIssueCommentBodies(number);
        expect(after.length).toBe(baseline);
    }
);
