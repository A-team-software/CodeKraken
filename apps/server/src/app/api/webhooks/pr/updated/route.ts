import {
	BitbucketPullRequestUpdatedPayloadAdapter,
	GitHubPullRequestUpdatedPayloadAdapter,
	GitLabPullRequestUpdatedPayloadAdapter,
	PullRequestPayloadAdapter,
} from "@/app/services/pr";
import { authorizeWebhookRequest } from "@/app/middlewares/code-platform-auth-middleware";
import { PullRequestPlatform } from "@/app/types/pull-request-platform";
import { NextRequest, NextResponse } from "next/server";

function resolveAdapter(platform: PullRequestPlatform): PullRequestPayloadAdapter {
	switch (platform) {
		case "github":
			return new GitHubPullRequestUpdatedPayloadAdapter();
		case "gitlab":
			return new GitLabPullRequestUpdatedPayloadAdapter();
		case "bitbucket":
			return new BitbucketPullRequestUpdatedPayloadAdapter();
		default: {
			const exhaustiveCheck: never = platform;
			throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
		}
	}
}

function resolveWebhookSecret(platform: PullRequestPlatform): string {
	switch (platform) {
		case "github":
			return (process.env.GITHUB_WEBHOOK_AUTH_SECRET || process.env.GITHUB_WEBHOOK_SECRET || "").trim();
		case "gitlab":
			return (process.env.GITLAB_WEBHOOK_AUTH_SECRET || process.env.GITLAB_WEBHOOK_SECRET || "").trim();
		case "bitbucket":
			return (process.env.BITBUCKET_WEBHOOK_AUTH_SECRET || process.env.BITBUCKET_WEBHOOK_SECRET || "").trim();
		default: {
			const exhaustiveCheck: never = platform;
			throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
		}
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const rawBody = await req.text();
		const authResult = await authorizeWebhookRequest(
			req,
			rawBody,
			req.nextUrl.searchParams.get("platform") || req.nextUrl.searchParams.get("provider")
		);
		if (!authResult.authorized) {
			return authResult.response;
		}
		const platform = authResult.platform;
		const webhookSecret = resolveWebhookSecret(platform);
		if (!webhookSecret) {
			return NextResponse.json({ success: false, error: "Webhook secret is not configured." }, { status: 401 });
		}

		let payload: unknown;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
		}

		const adapter = resolveAdapter(platform);
		const adaptedPayload = adapter.adapt(payload);

		return NextResponse.json({ success: true, platform, pr: adaptedPayload });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected error while processing PR updated webhook.";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
