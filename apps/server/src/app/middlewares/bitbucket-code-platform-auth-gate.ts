import { createHmac } from "node:crypto";

import { CodePlatformAuthGate, compareSecrets } from "@/app/middlewares/code-platform-auth-gate";

export class BitbucketCodePlatformAuthGate implements CodePlatformAuthGate {
    async authorizeRequest(headers: Headers, rawBody: string): Promise<{ authorized: boolean; platform?: "bitbucket" }> {
        const secret = process.env.BITBUCKET_WEBHOOK_AUTH_SECRET?.trim();
        if (!secret) {
            return { authorized: true, platform: "bitbucket" };
        }

        const signature = headers.get("x-hub-signature");
        if (!signature?.startsWith("sha256=")) {
            return { authorized: false };
        }

        const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
        return { authorized: compareSecrets(signature, expected), platform: "bitbucket" };
    }
}
