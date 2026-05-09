import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GitLabCodePlatformAuthGate } from "./gitlab-code-platform-auth-gate";

describe("GitLabCodePlatformAuthGate", () => {
    const originalSecret = process.env.GITLAB_WEBHOOK_AUTH_SECRET;
    const originalLegacySecret = process.env.GITLAB_WEBHOOK_SECRET;

    beforeEach(() => {
        delete process.env.GITLAB_WEBHOOK_AUTH_SECRET;
        delete process.env.GITLAB_WEBHOOK_SECRET;
    });

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.GITLAB_WEBHOOK_AUTH_SECRET;
        } else {
            process.env.GITLAB_WEBHOOK_AUTH_SECRET = originalSecret;
        }

        if (originalLegacySecret === undefined) {
            delete process.env.GITLAB_WEBHOOK_SECRET;
        } else {
            process.env.GITLAB_WEBHOOK_SECRET = originalLegacySecret;
        }
    });

    it("authorizes when secret is not configured", async () => {
        const gate = new GitLabCodePlatformAuthGate();
        const result = await gate.authorizeRequest(new Headers(), "{}");

        expect(result).toEqual({ authorized: true, platform: "gitlab" });
    });

    it("authorizes when x-gitlab-token matches", async () => {
        process.env.GITLAB_WEBHOOK_AUTH_SECRET = "gitlab-secret";
        const gate = new GitLabCodePlatformAuthGate();

        const result = await gate.authorizeRequest(
            new Headers({ "x-gitlab-token": "gitlab-secret" }),
            "{}"
        );

        expect(result).toEqual({ authorized: true, platform: "gitlab" });
    });

    it("authorizes when legacy webhook secret is configured", async () => {
        process.env.GITLAB_WEBHOOK_SECRET = "legacy-gitlab-secret";
        const gate = new GitLabCodePlatformAuthGate();

        const result = await gate.authorizeRequest(
            new Headers({ "x-gitlab-token": "legacy-gitlab-secret" }),
            "{}"
        );

        expect(result).toEqual({ authorized: true, platform: "gitlab" });
    });

    it("rejects when token is missing or does not match", async () => {
        process.env.GITLAB_WEBHOOK_AUTH_SECRET = "gitlab-secret";
        const gate = new GitLabCodePlatformAuthGate();

        const missingResult = await gate.authorizeRequest(new Headers(), "{}");
        const wrongResult = await gate.authorizeRequest(
            new Headers({ "x-gitlab-token": "wrong-token" }),
            "{}"
        );

        expect(missingResult).toEqual({ authorized: false, platform: "gitlab" });
        expect(wrongResult).toEqual({ authorized: false, platform: "gitlab" });
    });
});
