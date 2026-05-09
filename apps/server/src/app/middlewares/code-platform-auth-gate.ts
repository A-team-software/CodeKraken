import { PullRequestPlatform } from "@/types/pull-request-platform";
import { timingSafeEqual } from "node:crypto";

export interface CodePlatformAuthGate {
    authorizeRequest(headers: Headers, rawBody: string): Promise<{ authorized: boolean; platform?: PullRequestPlatform }>;
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

export function compareSecrets(actual: string, expected: string): boolean {
    return safeTimingEqual(actual, expected);
}
