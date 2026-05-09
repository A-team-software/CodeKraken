import { NextRequest, NextResponse } from "next/server";

import { BitbucketCodePlatformAuthGate } from "@/app/middlewares/bitbucket-code-platform-auth-gate";
import { CodePlatformAuthGate } from "@/app/middlewares/code-platform-auth-gate";
import { GithubCodePlatformAuthGate } from "@/app/middlewares/github-code-platform-auth-gate";
import { GitlabCodePlatformAuthGate } from "@/app/middlewares/gitlab-code-platform-auth-gate";
import { resolvePlatform } from "@/app/api/webhooks/pr/webhook-helpers";
import { PullRequestPlatform } from "@/types/pull-request-platform";

const gateByPlatform: Record<PullRequestPlatform, CodePlatformAuthGate> = {
    github: new GithubCodePlatformAuthGate(),
    gitlab: new GitlabCodePlatformAuthGate(),
    bitbucket: new BitbucketCodePlatformAuthGate(),
};

type AuthorizedResult = {
    authorized: true;
    platform: PullRequestPlatform;
};

type UnauthorizedResult = {
    authorized: false;
    response: NextResponse;
};

export async function authorizeWebhookRequest(
    req: NextRequest,
    rawBody: string,
    platformParamValue: string | null
): Promise<AuthorizedResult | UnauthorizedResult> {
    let platform: PullRequestPlatform;
    try {
        platform = resolvePlatform(platformParamValue);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Missing or invalid platform query parameter.";
        return {
            authorized: false,
            response: NextResponse.json({ success: false, error: message }, { status: 400 }),
        };
    }

    const gate = gateByPlatform[platform];
    const authResult = await gate.authorizeRequest(req.headers, rawBody);
    if (!authResult.authorized) {
        return {
            authorized: false,
            response: NextResponse.json({ success: false, error: "Webhook authentication failed." }, { status: 401 }),
        };
    }

    return { authorized: true, platform };
}
