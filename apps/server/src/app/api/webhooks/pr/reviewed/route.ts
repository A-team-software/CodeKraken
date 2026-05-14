import {
	BitbucketPullRequestReviewPayloadAdapter,
	GitHubPullRequestReviewPayloadAdapter,
	GitLabPullRequestReviewPayloadAdapter,
	PullRequestServiceImpl,
} from "@/app/services/pr";
import { authorizeWebhookRequest } from "@/app/middlewares/code-platform-auth-middleware";
import { ReviewPayloadAdapter } from "@/app/services/pr/review-payload-adapter";
import { PullRequestPlatform } from "@/app/types/pull-request-platform";
import { NextRequest, NextResponse } from "next/server";
import { ApiRes } from "@/utils/api_response";
import { wrapRoute } from "@/utils/api_handler";

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

export const POST = wrapRoute(async (req: NextRequest) => {
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
        return ApiRes.badRequest("Invalid JSON payload.");
    }

    const adapter = resolveAdapter(platform);
    const reviewPayload = adapter.adapt(payload);
    const service = new PullRequestServiceImpl();
    await service.onPullRequestReviewed(reviewPayload, platform);

    return {
        platform,
        review: reviewPayload,
    };
});
