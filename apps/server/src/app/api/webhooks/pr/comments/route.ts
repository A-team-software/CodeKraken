import {
	BitbucketPullRequestCommentPayloadAdapter,
	GitHubPullRequestCommentPayloadAdapter,
	GitLabPullRequestCommentPayloadAdapter,
	PullRequestCommentPayloadAdapter,
	PullRequestServiceImpl
} from "@/app/services/pr";
import { PullRequestPlatform } from "@/brain/runner/runner";
import { createHmac, timingSafeEqual } from "node:crypto";
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
		default: {
			const exhaustiveCheck: never = platform;
			throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
		}
	}
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

function verifyWebhookSignature(req: NextRequest, platform: PullRequestPlatform, rawBody: string): boolean {
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

export async function POST(req: NextRequest): Promise<NextResponse> {
	try {
		const platform = resolvePlatform(req.nextUrl.searchParams.get("platform"));
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
