import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GitHubCodePlatformAuthGate } from "./github-code-platform-auth-gate";

describe("GitHubCodePlatformAuthGate", () => {
    const originalSecret = process.env.GITHUB_WEBHOOK_AUTH_SECRET;
    const originalLegacySecret = process.env.GITHUB_WEBHOOK_SECRET;

    beforeEach(() => {
        delete process.env.GITHUB_WEBHOOK_AUTH_SECRET;
        delete process.env.GITHUB_WEBHOOK_SECRET;
    });

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.GITHUB_WEBHOOK_AUTH_SECRET;
        } else {
            process.env.GITHUB_WEBHOOK_AUTH_SECRET = originalSecret;
        }

        if (originalLegacySecret === undefined) {
            delete process.env.GITHUB_WEBHOOK_SECRET;
        } else {
            process.env.GITHUB_WEBHOOK_SECRET = originalLegacySecret;
        }
    });

    it("authorizes when secret is not configured", async () => {
        const gate = new GitHubCodePlatformAuthGate();
        const result = await gate.authorizeRequest(new Headers(), "{}");

        expect(result).toEqual({ authorized: true, platform: "github" });
    });

    it("authorizes when x-hub-signature-256 matches", async () => {
        process.env.GITHUB_WEBHOOK_AUTH_SECRET = "github-secret";
        const rawBody = JSON.stringify({ hello: "world" });
        const signature = `sha256=${createHmac("sha256", "github-secret").update(rawBody).digest("hex")}`;

        const gate = new GitHubCodePlatformAuthGate();
        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature-256": signature }),
            rawBody
        );

        expect(result).toEqual({ authorized: true, platform: "github" });
    });

    it("authorizes when legacy webhook secret is configured", async () => {
        process.env.GITHUB_WEBHOOK_SECRET = "legacy-github-secret";
        const rawBody = JSON.stringify({ hello: "legacy" });
        const signature = `sha256=${createHmac("sha256", "legacy-github-secret").update(rawBody).digest("hex")}`;

        const gate = new GitHubCodePlatformAuthGate();
        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature-256": signature }),
            rawBody
        );

        expect(result).toEqual({ authorized: true, platform: "github" });
    });

    it("rejects when signature header is missing or malformed", async () => {
        process.env.GITHUB_WEBHOOK_AUTH_SECRET = "github-secret";
        const gate = new GitHubCodePlatformAuthGate();

        const missingResult = await gate.authorizeRequest(new Headers(), "{}");
        const malformedResult = await gate.authorizeRequest(
            new Headers({ "x-hub-signature-256": "not-sha256" }),
            "{}"
        );

        expect(missingResult).toEqual({ authorized: false });
        expect(malformedResult).toEqual({ authorized: false });
    });

    it("rejects when signature does not match", async () => {
        process.env.GITHUB_WEBHOOK_AUTH_SECRET = "github-secret";
        const gate = new GitHubCodePlatformAuthGate();

        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature-256": "sha256=deadbeef" }),
            JSON.stringify({ foo: "bar" })
        );

        expect(result).toEqual({ authorized: false, platform: "github" });
    });
});
