import {
	BitbucketPullRequestCommentPayloadAdapter,
	GitHubPullRequestCommentPayloadAdapter,
	GitLabPullRequestCommentPayloadAdapter,
	PullRequestCommentPayloadAdapter,
	PullRequestServiceImpl
} from "@/app/services/pr";
import { PullRequestPlatform } from "@/brain/runner/runner";
import { NextRequest, NextResponse } from "next/server";

function resolvePlatform(value: string | null): PullRequestPlatform {
	const normalized = (value || "").trim().toLowerCase();
	if (normalized === "github" || normalized === "gitlab" || normalized === "bitbucket") {
		return normalized;
	}

	throw new Error("Missing or invalid platform query parameter. Use one of: github, gitlab, bitbucket.");
}

function resolveAdapter(platform: PullRequestPlatform): PullRequestCommentPayloadAdapter {
	switch (platform) {
		case "github":
			return new GitHubPullRequestCommentPayloadAdapter();
		case "gitlab":
			return new GitLabPullRequestCommentPayloadAdapter();
		case "bitbucket":
			return new BitbucketPullRequestCommentPayloadAdapter();
        default:           
            const exhaustiveCheck: never = platform;
            throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
	}
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const platform = resolvePlatform(req.nextUrl.searchParams.get("platform"));

		let payload: unknown;
		try {
			payload = await req.json();
		} catch {
			return NextResponse.json({ success: false, error: "Invalid JSON payload." }, { status: 400 });
		}

		const adapter = resolveAdapter(platform);
		const commentPayload = adapter.adapt(payload);
		const service = new PullRequestServiceImpl();
		await service.onPullRequestCommentAdded(commentPayload, platform);

		return NextResponse.json({
			success: true,
			platform,
			comment: commentPayload
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected error while processing PR comment webhook.";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
