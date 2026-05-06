import { RunnerTaskConfig } from "../services/base-project-manager-task-processor";
import { ProjectManagerTaskProcessorFactory } from "../services/project-manager-task-processor-factory";
import { WebhookInvocation } from "../services/task-processor";
import { NextRequest, NextResponse } from "next/server";
import { SafeExecute } from "@oliver/core/src/errors";

function buildDefaultTaskConfig(): RunnerTaskConfig {
	return {
		repoUrl: process.env.OPENCODE_TASK_REPO_URL || process.env.OPENCODE_REPO_URL || "",
		mode: process.env.OPENCODE_TASK_MODE === "plan" ? "plan" : "agent",
		branch: process.env.OPENCODE_TASK_BRANCH,
		commitHash: process.env.OPENCODE_TASK_COMMIT,
		vars: {}
	};
}

function resolveTaskConfig(body: Record<string, unknown>): [RunnerTaskConfig | null, string | null] {
	const defaultTaskConfig = buildDefaultTaskConfig();

	const repoUrl = typeof body.repoUrl === "string" && body.repoUrl.trim().length > 0
		? body.repoUrl
		: defaultTaskConfig.repoUrl;
	const mode = body.mode === "agent" || body.mode === "plan"
		? body.mode
		: defaultTaskConfig.mode;

	if (!repoUrl) {
		return [null, "Missing repoUrl. Include repoUrl in request body or set OPENCODE_TASK_REPO_URL."];
	}

	return [{
		...defaultTaskConfig,
		repoUrl,
		mode,
		branch: typeof body.branch === "string" && body.branch.trim().length > 0 ? body.branch : defaultTaskConfig.branch,
		commitHash: typeof body.commitHash === "string" && body.commitHash.trim().length > 0 ? body.commitHash : defaultTaskConfig.commitHash
	}, null];
}

export async function POST(req: NextRequest) {
	try {
		const configuredToken = process.env.OPENCODE_TASK_API_TOKEN?.trim();
		const allowUnauthenticated = process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED?.trim().toLowerCase() === "true";

		if (!allowUnauthenticated) {
			if (!configuredToken) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized"
					},
					{ status: 401 }
				);
			}
			const authHeader = req.headers.get("authorization");
			const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

			if (bearerToken !== configuredToken) {
				return NextResponse.json(
					{
						success: false,
						error: "Unauthorized"
					},
					{ status: 401 }
				);
			}
		}

		const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
		if (bodyError) return NextResponse.json({ success: false, error: bodyError.message || 'Invalid request body' }, { status: 400 });
		const bodyRecord = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};

		const invocation: WebhookInvocation = {
			body: bodyRecord,
			headers: Object.fromEntries(req.headers.entries()) as Record<string, string | undefined>,
			query: Object.fromEntries(req.nextUrl.searchParams.entries())
		};

		const [taskConfig, taskConfigError] = resolveTaskConfig(bodyRecord);
		if (taskConfigError || !taskConfig) return NextResponse.json({ success: false, error: taskConfigError || 'Invalid task config' }, { status: 400 });
		const processor = new ProjectManagerTaskProcessorFactory().createProcessor(invocation, taskConfig);
		const [result, processError] = await SafeExecute.withSync(async () => processor.processTask(invocation)).execute();

		if (processError || !result) return NextResponse.json({ success: false, error: processError?.message || 'Task processing failed' }, { status: 500 });

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
