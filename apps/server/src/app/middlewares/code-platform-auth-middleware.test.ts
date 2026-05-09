import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolvePlatformMock,
    githubAuthorizeRequestMock,
    gitlabAuthorizeRequestMock,
    bitbucketAuthorizeRequestMock,
} = vi.hoisted(() => ({
    resolvePlatformMock: vi.fn(),
    githubAuthorizeRequestMock: vi.fn(),
    gitlabAuthorizeRequestMock: vi.fn(),
    bitbucketAuthorizeRequestMock: vi.fn(),
}));

vi.mock("@/app/api/webhooks/pr/webhook-helpers", () => ({
    resolvePlatform: resolvePlatformMock,
}));

vi.mock("@/app/middlewares/github-code-platform-auth-gate", () => ({
    GithubCodePlatformAuthGate: vi.fn().mockImplementation(function () {
        return {
            authorizeRequest: githubAuthorizeRequestMock,
        };
    }),
}));

vi.mock("@/app/middlewares/gitlab-code-platform-auth-gate", () => ({
    GitlabCodePlatformAuthGate: vi.fn().mockImplementation(function () {
        return {
            authorizeRequest: gitlabAuthorizeRequestMock,
        };
    }),
}));

vi.mock("@/app/middlewares/bitbucket-code-platform-auth-gate", () => ({
    BitbucketCodePlatformAuthGate: vi.fn().mockImplementation(function () {
        return {
            authorizeRequest: bitbucketAuthorizeRequestMock,
        };
    }),
}));

import { authorizeWebhookRequest } from "./code-platform-auth-middleware";

function createRequest(headers?: Record<string, string>): NextRequest {
    return new NextRequest("http://localhost:3000/api/webhooks/pr/comments?platform=github", {
        method: "POST",
        headers,
        body: JSON.stringify({})
    });
}

describe("authorizeWebhookRequest", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resolvePlatformMock.mockReturnValue("github");
        githubAuthorizeRequestMock.mockResolvedValue({ authorized: true, platform: "github" });
        gitlabAuthorizeRequestMock.mockResolvedValue({ authorized: true, platform: "gitlab" });
        bitbucketAuthorizeRequestMock.mockResolvedValue({ authorized: true, platform: "bitbucket" });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("returns 400 when platform resolution fails", async () => {
        resolvePlatformMock.mockImplementationOnce(() => {
            throw new Error("Missing or invalid platform query parameter.");
        });

        const result = await authorizeWebhookRequest(createRequest(), "{}", "invalid");

        expect(result.authorized).toBe(false);
        if (!result.authorized) {
            expect(result.response.status).toBe(400);
            await expect(result.response.json()).resolves.toEqual(
                expect.objectContaining({
                    success: false,
                    error: expect.stringContaining("Missing or invalid platform")
                })
            );
        }
    });

    it("delegates to the github gate and returns authorized result", async () => {
        resolvePlatformMock.mockReturnValueOnce("github");

        const request = createRequest({ "x-hub-signature-256": "sha256=abc" });
        const result = await authorizeWebhookRequest(request, "{\"ok\":true}", "github");

        expect(githubAuthorizeRequestMock).toHaveBeenCalledTimes(1);
        expect(githubAuthorizeRequestMock).toHaveBeenCalledWith(request.headers, "{\"ok\":true}");
        expect(result).toEqual({ authorized: true, platform: "github" });
    });

    it("returns 401 when selected gate rejects request", async () => {
        resolvePlatformMock.mockReturnValueOnce("gitlab");
        gitlabAuthorizeRequestMock.mockResolvedValueOnce({ authorized: false, platform: "gitlab" });

        const result = await authorizeWebhookRequest(createRequest(), "{}", "gitlab");

        expect(gitlabAuthorizeRequestMock).toHaveBeenCalledTimes(1);
        expect(result.authorized).toBe(false);
        if (!result.authorized) {
            expect(result.response.status).toBe(401);
            await expect(result.response.json()).resolves.toEqual(
                expect.objectContaining({ success: false, error: "Webhook authentication failed." })
            );
        }
    });

    it("uses bitbucket gate for bitbucket platform", async () => {
        resolvePlatformMock.mockReturnValueOnce("bitbucket");

        const result = await authorizeWebhookRequest(createRequest(), "{}", "bitbucket");

        expect(bitbucketAuthorizeRequestMock).toHaveBeenCalledTimes(1);
        expect(githubAuthorizeRequestMock).not.toHaveBeenCalled();
        expect(gitlabAuthorizeRequestMock).not.toHaveBeenCalled();
        expect(result).toEqual({ authorized: true, platform: "bitbucket" });
    });
});
