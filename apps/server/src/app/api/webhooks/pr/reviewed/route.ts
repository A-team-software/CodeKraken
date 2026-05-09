import {
	BitbucketPullRequestReviewPayloadAdapter,
	GitHubPullRequestReviewPayloadAdapter,
	GitLabPullRequestReviewPayloadAdapter,
	PullRequestServiceImpl,
} from "@/app/services/pr";
import { authorizeWebhookRequest } from "@/app/middlewares/code-platform-auth-middleware";
import { ReviewPayloadAdapter } from "@/app/services/pr/review-payload-adapter";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { NextRequest, NextResponse } from "next/server";

function resolveAdapter(platform: PullRequestPlatform): ReviewPayloadAdapter {
	switch (platform) {
		case "github":
			return new GitHubPullRequestReviewPayloadAdapter();
		case "gitlab":
			return new GitLabPullRequestReviewPayloadAdapter();
		case "bitbucket":
			return new BitbucketPullRequestReviewPayloadAdapter();
		default: {
			const exhaustiveCheck: never = platform;
			throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
		}
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const rawBody = await req.text();
		const authResult = await authorizeWebhookRequest(req, rawBody, req.nextUrl.searchParams.get("platform"));
		if (!authResult.authorized) {
			return authResult.response;
		}
		const platform = authResult.platform;

		let payload: unknown;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
		}

		const adapter = resolveAdapter(platform);
		const reviewPayload = adapter.adapt(payload);
		const service = new PullRequestServiceImpl();
		await service.onPullRequestReviewed(reviewPayload, platform);

		return NextResponse.json({
			success: true,
			platform,
			review: reviewPayload,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected error while processing PR review webhook.";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
