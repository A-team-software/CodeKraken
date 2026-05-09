import {
	BitbucketPullRequestUpdatedPayloadAdapter,
	GitHubPullRequestUpdatedPayloadAdapter,
	GitLabPullRequestUpdatedPayloadAdapter,
	PullRequestPayloadAdapter,
} from "@/app/services/pr";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { resolvePlatform, verifyWebhookSignature } from "../webhook-helpers";
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

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const platform = resolvePlatform(req.nextUrl.searchParams.get("platform") || req.nextUrl.searchParams.get("provider"));
		const rawBody = await req.text();

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
