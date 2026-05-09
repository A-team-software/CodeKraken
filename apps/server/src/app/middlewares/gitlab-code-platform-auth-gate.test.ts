import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GitlabCodePlatformAuthGate } from "./gitlab-code-platform-auth-gate";

describe("GitlabCodePlatformAuthGate", () => {
    const originalSecret = process.env.GITLAB_WEBHOOK_AUTH_SECRET;

    beforeEach(() => {
        delete process.env.GITLAB_WEBHOOK_AUTH_SECRET;
    });

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.GITLAB_WEBHOOK_AUTH_SECRET;
        } else {
            process.env.GITLAB_WEBHOOK_AUTH_SECRET = originalSecret;
        }
    });

    it("authorizes when secret is not configured", async () => {
        const gate = new GitlabCodePlatformAuthGate();
        const result = await gate.authorizeRequest(new Headers(), "{}");

        expect(result).toEqual({ authorized: true, platform: "gitlab" });
    });

    it("authorizes when x-gitlab-token matches", async () => {
        process.env.GITLAB_WEBHOOK_AUTH_SECRET = "gitlab-secret";
        const gate = new GitlabCodePlatformAuthGate();

        const result = await gate.authorizeRequest(
            new Headers({ "x-gitlab-token": "gitlab-secret" }),
            "{}"
        );

        expect(result).toEqual({ authorized: true, platform: "gitlab" });
    });

    it("rejects when token is missing or does not match", async () => {
        process.env.GITLAB_WEBHOOK_AUTH_SECRET = "gitlab-secret";
        const gate = new GitlabCodePlatformAuthGate();

        const missingResult = await gate.authorizeRequest(new Headers(), "{}");
        const wrongResult = await gate.authorizeRequest(
            new Headers({ "x-gitlab-token": "wrong-token" }),
            "{}"
        );

        expect(missingResult).toEqual({ authorized: false, platform: "gitlab" });
        expect(wrongResult).toEqual({ authorized: false, platform: "gitlab" });
    });
});
