import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const {
    adapterMocks,
    authorizeWebhookRequestMock,
} = vi.hoisted(() => {
    const githubAdapterMock = {
        adapt: vi.fn((payload: any) => ({
            id: payload.pull_request?.number?.toString() || "1",
            title: payload.pull_request?.title || "PR",
            description: payload.pull_request?.body || undefined,
        }))
    };
    const gitlabAdapterMock = {
        adapt: vi.fn((payload: any) => ({
            id: (payload.object_attributes?.iid ?? payload.object_attributes?.id)?.toString() || "1",
            title: payload.object_attributes?.title || "MR",
            description: payload.object_attributes?.description || undefined,
        }))
    };
    const bitbucketAdapterMock = {
        adapt: vi.fn((payload: any) => ({
            id: payload.pullrequest?.id?.toString() || "1",
            title: payload.pullrequest?.title || "PR",
            description: payload.pullrequest?.description || undefined,
        }))
    };

    return {
        adapterMocks: {
            github: githubAdapterMock,
            gitlab: gitlabAdapterMock,
            bitbucket: bitbucketAdapterMock,
        },
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
    GitHubPullRequestUpdatedPayloadAdapter: vi.fn().mockImplementation(function () {
        return adapterMocks.github;
    }),
    GitLabPullRequestUpdatedPayloadAdapter: vi.fn().mockImplementation(function () {
        return adapterMocks.gitlab;
    }),
    BitbucketPullRequestUpdatedPayloadAdapter: vi.fn().mockImplementation(function () {
        return adapterMocks.bitbucket;
    })
}));

import { POST } from "./route";

function createRequest(platform: string | null, body: unknown): NextRequest {
    const url = platform
        ? `http://localhost:3000/api/webhooks/pr/updated?platform=${platform}`
        : "http://localhost:3000/api/webhooks/pr/updated";

    return new NextRequest(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    });
}

describe("POST /api/webhooks/pr/updated", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
        process.env.GITHUB_WEBHOOK_AUTH_SECRET = "test-github-secret";
        process.env.GITLAB_WEBHOOK_AUTH_SECRET = "test-gitlab-secret";
        process.env.BITBUCKET_WEBHOOK_AUTH_SECRET = "test-bitbucket-secret";
    });

    afterEach(() => {
        vi.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
    });

    it("normalizes github update payload", async () => {
        const response = await POST(createRequest("github", {
            action: "edited",
            pull_request: { number: 101, title: "Refactor", body: "Details" }
        }));

        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual(expect.objectContaining({
            success: true,
            platform: "github",
            pr: {
                id: "101",
                title: "Refactor",
                description: "Details"
            }
        }));
    });

    it("returns 400 when platform is missing", async () => {
        const response = await POST(createRequest(null, { pull_request: { number: 1, title: "T" } }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.success).toBe(false);
        expect(payload.error).toContain("Missing or invalid platform");
    });

    it("returns 401 when signature verification fails", async () => {
        authorizeWebhookRequestMock.mockResolvedValueOnce({
            authorized: false,
            response: NextResponse.json({ success: false, error: "Webhook authentication failed." }, { status: 401 })
        });

        const response = await POST(createRequest("gitlab", {
            object_kind: "merge_request",
            object_attributes: { iid: 7, title: "Fix" }
        }));

        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.error).toContain("Webhook authentication failed");
    });

    it("returns 401 when webhook secret is not configured", async () => {
        delete process.env.GITLAB_WEBHOOK_AUTH_SECRET;

        const response = await POST(createRequest("gitlab", {
            object_kind: "merge_request",
            object_attributes: { iid: 7, title: "Fix" }
        }));

        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload.error).toContain("Webhook secret is not configured");
    });

    it("returns 400 for unsupported payload shape", async () => {
        adapterMocks.github.adapt.mockImplementationOnce(() => {
            throw new Error("Unsupported event payload");
        });

        const response = await POST(createRequest("github", { action: "edited" }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.success).toBe(false);
        expect(payload.error).toContain("Unsupported event payload");
    });
});
