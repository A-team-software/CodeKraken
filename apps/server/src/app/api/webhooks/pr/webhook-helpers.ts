import { PullRequestPlatform } from "@/brain/runner/runner";
import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";

export function resolvePlatform(value: string | null): PullRequestPlatform {
    const normalized = (value || "").trim().toLowerCase();
    if (normalized === "github" || normalized === "gitlab" || normalized === "bitbucket") {
        return normalized;
    }

    throw new Error("Missing or invalid platform query parameter. Use one of: github, gitlab, bitbucket.");
}

function safeTimingEqual(a: string, b: string): boolean {
    try {
        const aBuf = Buffer.from(a);
        const bBuf = Buffer.from(b);
        return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
    } catch {
        return false;
    }
}

export function verifyWebhookSignature(req: NextRequest, platform: PullRequestPlatform, rawBody: string): boolean {
    switch (platform) {
        case "github": {
            const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
            if (!secret) return true;
            const signature = req.headers.get("x-hub-signature-256");
            if (!signature?.startsWith("sha256=")) return false;
            const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
            return safeTimingEqual(signature, expected);
        }
        case "gitlab": {
            const secret = process.env.GITLAB_WEBHOOK_SECRET?.trim();
            if (!secret) return true;
            const token = req.headers.get("x-gitlab-token") ?? "";
            return safeTimingEqual(token, secret);
        }
        case "bitbucket": {
            const secret = process.env.BITBUCKET_WEBHOOK_SECRET?.trim();
            if (!secret) return true;
            const signature = req.headers.get("x-hub-signature");
            if (!signature?.startsWith("sha256=")) return false;
            const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
            return safeTimingEqual(signature, expected);
        }
    }

    const exhaustiveCheck: never = platform;
    return false && exhaustiveCheck;
}
