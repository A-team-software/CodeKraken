import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    adapterMocks,
    reviewServiceMock,
    createdServiceMock,
    authorizeWebhookRequestMock,
} = vi.hoisted(() => {
    const githubReviewAdapterMock = {
        adapt: vi.fn((payload: any) => ({
            id: payload.pull_request?.number?.toString() || "1",
            branch: payload.pull_request?.head?.ref || "main",
            status: payload.review?.state === "approved" ? "approved" : "changes_requested"
        }))
    };
    const gitlabReviewAdapterMock = {
        adapt: vi.fn((payload: any) => ({
            id: payload.object_attributes?.iid?.toString() || "1",
            branch: payload.object_attributes?.source_branch || "main",
            status: payload.object_attributes?.action === "approved" ? "approved" : "changes_requested"
        }))
    };
    const bitbucketReviewAdapterMock = {
        adapt: vi.fn((payload: any) => ({
            id: payload.pullrequest?.id?.toString() || "1",
            branch: payload.pullrequest?.source?.branch?.name || "main",
            status: payload.approval !== undefined ? "approved" : "changes_requested"
        }))
    };

    return {
        adapterMocks: {
            github: githubReviewAdapterMock,
            gitlab: gitlabReviewAdapterMock,
            bitbucket: bitbucketReviewAdapterMock
        },
        reviewServiceMock: vi.fn().mockResolvedValue(undefined),
        createdServiceMock: vi.fn().mockImplementation(function () {
            return {
                onPullRequestReviewed: reviewServiceMock,
                onPullRequestMerged: vi.fn(),
                onPullRequestCommentAdded: vi.fn()
            };
        }),
        authorizeWebhookRequestMock: vi.fn(async (_req: NextRequest, _rawBody: string, platformValue: string | null) => {
            const normalized = (platformValue || "").trim().toLowerCase();
            if (normalized === "github" || normalized === "gitlab" || normalized === "bitbucket") {
                return { authorized: true as const, platform: normalized };
            }

            return {
                authorized: false as const,
                response: NextResponse.json(
                    { success: false, error: "Missing or invalid platform query parameter. Use one of: github, gitlab, bitbucket." },
                    { status: 400 }
                )
            };
        })
    };
});

vi.mock("@/app/middlewares/code-platform-auth-middleware", () => ({
    authorizeWebhookRequest: authorizeWebhookRequestMock
}));

vi.mock("@/app/services/pr", () => ({
    GitHubPullRequestReviewPayloadAdapter: vi.fn().mockImplementation(function () {
        return adapterMocks.github;
    }),
    GitLabPullRequestReviewPayloadAdapter: vi.fn().mockImplementation(function () {
        return adapterMocks.gitlab;
    }),
    BitbucketPullRequestReviewPayloadAdapter: vi.fn().mockImplementation(function () {
        return adapterMocks.bitbucket;
    }),
    PullRequestServiceImpl: createdServiceMock
}));

import { POST } from "./route";

function createRequest(platform: string, body: unknown): NextRequest {
    return new NextRequest(`http://localhost:3000/api/webhooks/pr/reviewed?platform=${platform}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    });
}

describe("POST /api/webhooks/pr/reviewed", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("adapts github review payload and calls service", async () => {
        const response = await POST(createRequest("github", {
            review: { state: "approved" },
            pull_request: { number: 101, head: { ref: "feature-1" } }
        }));

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            code: 200,
            data: {
                platform: "github",
                review: {
                    id: "101",
                    branch: "feature-1",
                    status: "approved"
                }
            }
        });
        expect(reviewServiceMock).toHaveBeenCalledWith(
            { id: "101", branch: "feature-1", status: "approved" },
            "github"
        );
    });

    it("rejects invalid JSON", async () => {
        const req = new NextRequest("http://localhost:3000/api/webhooks/pr/reviewed?platform=github", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{ invalid json }"
        });

        const response = await POST(req);
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.code).toBe(400);
        expect(payload.message).toBe("Invalid JSON payload.");
        expect(reviewServiceMock).not.toHaveBeenCalled();
    });

    it("returns 401 when signature verification fails", async () => {
        authorizeWebhookRequestMock.mockResolvedValueOnce({
            authorized: false,
            response: NextResponse.json({ success: false, error: "Webhook authentication failed." }, { status: 401 })
        });

        const response = await POST(createRequest("github", {
            review: { state: "approved" },
            pull_request: { number: 101, head: { ref: "feature-1" } }
        }));

        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.error).toContain("Webhook authentication failed");
        expect(reviewServiceMock).not.toHaveBeenCalled();
    });

    it("passes gitlab payload through the gitlab adapter", async () => {
        const response = await POST(createRequest("gitlab", {
            object_kind: "merge_request",
            object_attributes: {
                iid: 11,
                action: "approved",
                source_branch: "feature-2"
            }
        }));

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data.review).toEqual({ id: "11", branch: "feature-2", status: "approved" });
        expect(reviewServiceMock).toHaveBeenCalledWith(
            { id: "11", branch: "feature-2", status: "approved" },
            "gitlab"
        );
    });
});
