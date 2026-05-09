import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PullRequestServiceImpl } from "./pr-service";
import { PullRequestPlatform } from "@/types/pull-request-platform";

const ORIGINAL_ENV = { ...process.env };

const {
    startMock,
    startNextIterationMock,
    getTenantConfigMock,
    findLatestJobByPrIdMock,
    bufferCommentMock,
    createCodePlatformAdapterMock,
    adapterMock
} = vi.hoisted(() => {
    const adapterMock = {
        getPullRequestComments: vi.fn(),
        getPullRequestAuthorUsername: vi.fn(),
        postCommentOnPullRequest: vi.fn()
    };

    return {
        startMock: vi.fn().mockResolvedValue({ success: true, message: "started" }),
        startNextIterationMock: vi.fn().mockResolvedValue({ success: true, message: "next" }),
        getTenantConfigMock: vi.fn().mockResolvedValue({ incrementalPrsOn: false }),
        findLatestJobByPrIdMock: vi.fn().mockResolvedValue(null),
        bufferCommentMock: vi.fn().mockResolvedValue(undefined),
        createCodePlatformAdapterMock: vi.fn().mockReturnValue(adapterMock),
        adapterMock
    };
});

vi.mock("@/app/adapters/code-platform-adapter", () => ({
    createCodePlatformAdapter: createCodePlatformAdapterMock
}));

vi.mock("@/brain/runner/opencode", () => ({
    OpenCodeRunner: vi.fn().mockImplementation(function () {
        return {
            start: startMock,
            startNextIteration: startNextIterationMock,
            stop: vi.fn(),
            pause: vi.fn(),
            resume: vi.fn(),
            saveJob: vi.fn()
        };
    })
}));

vi.mock("@/brain/runner/config-persistence-layer", () => ({
    MongoConfigPersistenceLayer: vi.fn().mockImplementation(function () {
        return {
            getTenantConfig: getTenantConfigMock
        };
    })
}));

vi.mock("@/brain/runner/mongo-config-persistence-layer", () => ({
    MongoConfigPersistenceLayer: vi.fn().mockImplementation(function () {
        return {
            getTenantConfig: getTenantConfigMock
        };
    })
}));

vi.mock("@/brain/runner/mongo-job-persistence-layer", () => ({
    MongoJobPersistenceLayer: vi.fn().mockImplementation(function () {
        return {
            findLatestJobByPrId: findLatestJobByPrIdMock,
            saveJob: vi.fn(),
            getJob: vi.fn(),
            deleteJob: vi.fn()
        };
    })
}));

vi.mock("./comment-job-buffer-persistence-layer", () => ({
    MongoCommentJobBufferPersistenceLayer: vi.fn().mockImplementation(function () {
        return {
            bufferComment: bufferCommentMock,
            findUnprocessedBuffersOlderThan: vi.fn(),
            markProcessed: vi.fn()
        };
    })
}));

import { OpenCodeRunner } from "@/brain/runner/opencode";

describe("PullRequestServiceImpl", () => {
    let service: PullRequestServiceImpl;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
        process.env.OPENCODE_TASK_REPO_URL = "https://github.com/acme/repo.git";
        process.env.GITHUB_APP_USER = "oliver-ai";
        process.env.GITLAB_APP_USER = "oliver-ai";
        process.env.BITBUCKET_APP_USER = "oliver-ai";
        service = new PullRequestServiceImpl();
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("posts a thank-you comment when approved and job is incremental", async () => {
        findLatestJobByPrIdMock.mockResolvedValueOnce({ isIncremental: true });

        await service.onPullRequestReviewed(
            { id: "123", branch: "feature", status: "approved" },
            "github"
        );

        expect(createCodePlatformAdapterMock).toHaveBeenCalledWith("github");
        expect(adapterMock.postCommentOnPullRequest).toHaveBeenCalledWith(
            "123",
            expect.arrayContaining([
                expect.objectContaining({
                    content: expect.stringContaining("incremental workflow")
                })
            ])
        );
    });

    it("posts a general thank-you comment when approved and not incremental", async () => {
        findLatestJobByPrIdMock.mockResolvedValueOnce({ isIncremental: false });

        await service.onPullRequestReviewed(
            { id: "123", branch: "feature", status: "approved" },
            "github"
        );

        expect(adapterMock.postCommentOnPullRequest).toHaveBeenCalledWith(
            "123",
            expect.arrayContaining([
                expect.objectContaining({
                    content: expect.stringContaining("go ahead and merge")
                })
            ])
        );
    });

    it("asks for a detailed explanation when changes are requested but there are no unresolved comments", async () => {
        adapterMock.getPullRequestComments.mockResolvedValueOnce([]);

        await service.onPullRequestReviewed(
            { id: "123", branch: "feature", status: "changes_requested" },
            "github"
        );

        expect(adapterMock.postCommentOnPullRequest).toHaveBeenCalledWith(
            "123",
            expect.arrayContaining([
                expect.objectContaining({
                    content: expect.stringContaining("detailed explanation")
                })
            ])
        );
        expect(startMock).not.toHaveBeenCalled();
    });

    it("asks for code-specific explanation when unresolved comments are not code-related", async () => {
        adapterMock.getPullRequestComments.mockResolvedValueOnce([
            {
                id: "1",
                prId: "123",
                body: "please explain",
                author: "reviewer",
                branch: "feature",
                mentionedUsers: [],
                resolved: false
            }
        ]);

        await service.onPullRequestReviewed(
            { id: "123", branch: "feature", status: "changes_requested" },
            "github"
        );

        expect(adapterMock.postCommentOnPullRequest).toHaveBeenCalledWith(
            "123",
            expect.arrayContaining([
                expect.objectContaining({
                    content: expect.stringContaining("code-specific explanation")
                })
            ])
        );
        expect(startMock).not.toHaveBeenCalled();
    });

    it("starts the runner for unresolved code comments only", async () => {
        adapterMock.getPullRequestComments.mockResolvedValueOnce([
            {
                id: "1",
                prId: "123",
                body: "update this line",
                author: "reviewer",
                branch: "feature",
                mentionedUsers: [],
                filePath: "src/app.ts",
                lineNumber: 12,
                resolved: false
            },
            {
                id: "2",
                prId: "123",
                body: "ignore this resolved",
                author: "reviewer",
                branch: "feature",
                mentionedUsers: [],
                filePath: "src/other.ts",
                lineNumber: 5,
                resolved: true
            }
        ]);

        await service.onPullRequestReviewed(
            { id: "123", branch: "feature", status: "changes_requested" },
            "github"
        );

        expect(startMock).toHaveBeenCalledWith(
            expect.objectContaining({
                repoUrl: "https://github.com/acme/repo.git",
                mode: "agent",
                branch: "feature",
                vars: expect.objectContaining({
                    prId: "123",
                    platform: "github",
                    source: "pr-review-changes-requested"
                }),
                task: expect.stringContaining("src/app.ts:12")
            })
        );
        expect(adapterMock.postCommentOnPullRequest).not.toHaveBeenCalled();
    });

    it("returns early for rejected reviews", async () => {
        await service.onPullRequestReviewed(
            { id: "123", branch: "feature", status: "rejected" },
            "github"
        );

        expect(adapterMock.postCommentOnPullRequest).not.toHaveBeenCalled();
        expect(startMock).not.toHaveBeenCalled();
    });
});
