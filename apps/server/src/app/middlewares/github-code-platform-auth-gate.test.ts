import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GithubCodePlatformAuthGate } from "./github-code-platform-auth-gate";

describe("GithubCodePlatformAuthGate", () => {
    const originalSecret = process.env.GITHUB_WEBHOOK_AUTH_SECRET;

    beforeEach(() => {
        delete process.env.GITHUB_WEBHOOK_AUTH_SECRET;
    });

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.GITHUB_WEBHOOK_AUTH_SECRET;
        } else {
            process.env.GITHUB_WEBHOOK_AUTH_SECRET = originalSecret;
        }
    });

    it("authorizes when secret is not configured", async () => {
        const gate = new GithubCodePlatformAuthGate();
        const result = await gate.authorizeRequest(new Headers(), "{}");

        expect(result).toEqual({ authorized: true, platform: "github" });
    });

    it("authorizes when x-hub-signature-256 matches", async () => {
        process.env.GITHUB_WEBHOOK_AUTH_SECRET = "github-secret";
        const rawBody = JSON.stringify({ hello: "world" });
        const signature = `sha256=${createHmac("sha256", "github-secret").update(rawBody).digest("hex")}`;

        const gate = new GithubCodePlatformAuthGate();
        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature-256": signature }),
            rawBody
        );

        expect(result).toEqual({ authorized: true, platform: "github" });
    });

    it("rejects when signature header is missing or malformed", async () => {
        process.env.GITHUB_WEBHOOK_AUTH_SECRET = "github-secret";
        const gate = new GithubCodePlatformAuthGate();

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
        const gate = new GithubCodePlatformAuthGate();

        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature-256": "sha256=deadbeef" }),
            JSON.stringify({ foo: "bar" })
        );

        expect(result).toEqual({ authorized: false, platform: "github" });
    });
});
