import {
	BitbucketPullRequestPayloadAdapter,
	GitHubPullRequestPayloadAdapter,
	GitLabPullRequestPayloadAdapter,
	PullRequestPayloadAdapter,
} from "@/app/services/pr";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { resolvePlatform, verifyWebhookSignature } from "../webhook-helpers";
import { NextRequest, NextResponse } from "next/server";

function resolveAdapter(platform: PullRequestPlatform): PullRequestPayloadAdapter {
	switch (platform) {
		case "github":
			return new GitHubPullRequestPayloadAdapter();
		case "gitlab":
			return new GitLabPullRequestPayloadAdapter();
		case "bitbucket":
			return new BitbucketPullRequestPayloadAdapter();
		default: {
			const exhaustiveCheck: never = platform;
			throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
		}
	}
}

function resolveWebhookSecret(platform: PullRequestPlatform): string | undefined {
	switch (platform) {
		case "github":
			return process.env.GITHUB_WEBHOOK_SECRET;
		case "gitlab":
			return process.env.GITLAB_WEBHOOK_SECRET;
		case "bitbucket":
			return process.env.BITBUCKET_WEBHOOK_SECRET;
		default: {
			const exhaustiveCheck: never = platform;
			throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
		}
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const platform = resolvePlatform(req.nextUrl.searchParams.get("platform") || req.nextUrl.searchParams.get("provider"));
		const rawBody = await req.text();
		const webhookSecret = resolveWebhookSecret(platform);

		if (!webhookSecret || webhookSecret.trim().length === 0) {
			return NextResponse.json({ success: false, error: "Webhook secret is not configured." }, { status: 401 });
		}

		if (!verifyWebhookSignature(req, platform, rawBody)) {
			return NextResponse.json({ success: false, error: "Webhook signature verification failed." }, { status: 401 });
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
