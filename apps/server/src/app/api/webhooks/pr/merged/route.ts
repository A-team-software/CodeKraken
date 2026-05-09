import {
	BitbucketPullRequestPayloadAdapter,
	GitHubPullRequestPayloadAdapter,
	GitLabPullRequestPayloadAdapter,
	PullRequestPayloadAdapter,
	PullRequestServiceImpl
} from "@/app/services/pr";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { resolvePlatform, verifyWebhookSignature } from "../webhook-helpers";
import { SafeExecute } from "@oliver/core";
import { NextRequest, NextResponse } from "next/server";

function resolveAdapter(platform: PullRequestPlatform): PullRequestPayloadAdapter {
	switch (platform) {
		case "github":
			return new GitHubPullRequestPayloadAdapter();
		case "gitlab":
			return new GitLabPullRequestPayloadAdapter();
		case "bitbucket":
			return new BitbucketPullRequestPayloadAdapter();
	}

	const exhaustiveCheck: never = platform;
	throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
}


function resolveClientId(req: NextRequest, body: unknown): string {
	const headerClientId = req.headers.get("x-forge-client-key")?.trim();
	if (headerClientId) {
		return headerClientId;
	}

	const queryClientId = req.nextUrl.searchParams.get("clientKey")?.trim() || req.nextUrl.searchParams.get("tenantId")?.trim();
	if (queryClientId) {
		return queryClientId;
	}

	const payload = body as Record<string, unknown> | undefined;
	const bodyClientId = typeof payload?.clientKey === "string"
		? payload.clientKey.trim()
		: typeof payload?.tenantId === "string"
			? payload.tenantId.trim()
			: "";

	if (!bodyClientId) {
		throw new Error("Missing client identifier. Provide x-forge-client-key header, clientKey/tenantId query param, or clientKey/tenantId in body.");
	}

	return bodyClientId;
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
		const clientId = resolveClientId(req, payload);

		const service = new PullRequestServiceImpl();
		const [, onPullRequestMergedError] = await SafeExecute.withSync(async () =>
			service.onPullRequestMerged({
				prId: adaptedPayload.id,
				platform,
				clientId
			})
		).execute();

		if (onPullRequestMergedError) {
			throw onPullRequestMergedError;
		}

		return NextResponse.json({
			success: true,
			prId: adaptedPayload.id,
			platform,
			clientId
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected error while processing merged PR webhook.";
		return NextResponse.json(
			{
				success: false,
				error: message
			},
			{ status: 400 }
		);
	}
}
