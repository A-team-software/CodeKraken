import { RunnerTaskConfig } from "../services/base-project-manager-task-processor";
import { ProjectManagerTaskProcessorFactory } from "../services/project-manager-task-processor-factory";
import { WebhookInvocation } from "../services/task-processor";
import { NextRequest, NextResponse } from "next/server";

function buildDefaultTaskConfig(): RunnerTaskConfig {
	return {
		repoUrl: process.env.OPENCODE_TASK_REPO_URL || process.env.OPENCODE_REPO_URL || "",
		mode: process.env.OPENCODE_TASK_MODE === "plan" ? "plan" : "agent",
		branch: process.env.OPENCODE_TASK_BRANCH,
		commitHash: process.env.OPENCODE_TASK_COMMIT,
		vars: {}
	};
}

function resolveTaskConfig(body: Record<string, unknown>): RunnerTaskConfig {
	const defaultTaskConfig = buildDefaultTaskConfig();

	const repoUrl = typeof body.repoUrl === "string" && body.repoUrl.trim().length > 0
		? body.repoUrl
		: defaultTaskConfig.repoUrl;

	if (!repoUrl) {
		throw new Error("Missing repoUrl. Include repoUrl in request body or set OPENCODE_TASK_REPO_URL.");
	}

	return {
		...defaultTaskConfig,
		repoUrl,
		mode: body.mode === "plan" ? "plan" : defaultTaskConfig.mode,
		branch: typeof body.branch === "string" && body.branch.trim().length > 0 ? body.branch : defaultTaskConfig.branch,
		commitHash: typeof body.commitHash === "string" && body.commitHash.trim().length > 0 ? body.commitHash : defaultTaskConfig.commitHash
	};
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const bodyRecord = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};

		const invocation: WebhookInvocation = {
			body: bodyRecord,
			headers: Object.fromEntries(req.headers.entries()) as Record<string, string | undefined>,
			query: Object.fromEntries(req.nextUrl.searchParams.entries())
		};

		const taskConfig = resolveTaskConfig(bodyRecord);
		const processor = new ProjectManagerTaskProcessorFactory().createProcessor(invocation, taskConfig);
		const result = await processor.processTask(invocation);

		const payload = {
			success: result.success,
			message: result.message,
			data: result.data
		};

		return NextResponse.json(payload, { status: result.success ? 200 : 500 });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected task webhook processing error.";
		return NextResponse.json(
			{
				success: false,
				error: message
			},
			{ status: 400 }
		);
	}
}
