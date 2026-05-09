import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BitbucketCodePlatformAuthGate } from "./bitbucket-code-platform-auth-gate";

describe("BitbucketCodePlatformAuthGate", () => {
    const originalSecret = process.env.BITBUCKET_WEBHOOK_AUTH_SECRET;

    beforeEach(() => {
        delete process.env.BITBUCKET_WEBHOOK_AUTH_SECRET;
    });

    afterEach(() => {
        if (originalSecret === undefined) {
            delete process.env.BITBUCKET_WEBHOOK_AUTH_SECRET;
        } else {
            process.env.BITBUCKET_WEBHOOK_AUTH_SECRET = originalSecret;
        }
    });

    it("authorizes when secret is not configured", async () => {
        const gate = new BitbucketCodePlatformAuthGate();
        const result = await gate.authorizeRequest(new Headers(), "{}");

        expect(result).toEqual({ authorized: true, platform: "bitbucket" });
    });

    it("authorizes when x-hub-signature matches", async () => {
        process.env.BITBUCKET_WEBHOOK_AUTH_SECRET = "bitbucket-secret";
        const rawBody = JSON.stringify({ hello: "world" });
        const signature = `sha256=${createHmac("sha256", "bitbucket-secret").update(rawBody).digest("hex")}`;

        const gate = new BitbucketCodePlatformAuthGate();
        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature": signature }),
            rawBody
        );

        expect(result).toEqual({ authorized: true, platform: "bitbucket" });
    });

    it("rejects when signature header is missing or malformed", async () => {
        process.env.BITBUCKET_WEBHOOK_AUTH_SECRET = "bitbucket-secret";
        const gate = new BitbucketCodePlatformAuthGate();

        const missingResult = await gate.authorizeRequest(new Headers(), "{}");
        const malformedResult = await gate.authorizeRequest(
            new Headers({ "x-hub-signature": "not-sha256" }),
            "{}"
        );

        expect(missingResult).toEqual({ authorized: false });
        expect(malformedResult).toEqual({ authorized: false });
    });

    it("rejects when signature does not match", async () => {
        process.env.BITBUCKET_WEBHOOK_AUTH_SECRET = "bitbucket-secret";
        const gate = new BitbucketCodePlatformAuthGate();

        const result = await gate.authorizeRequest(
            new Headers({ "x-hub-signature": "sha256=deadbeef" }),
            JSON.stringify({ foo: "bar" })
        );

        expect(result).toEqual({ authorized: false, platform: "bitbucket" });
    });
});
