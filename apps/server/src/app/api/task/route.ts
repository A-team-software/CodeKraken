import { RunnerTaskConfig } from "../services/base-project-manager-task-processor";
import { ProjectManagerTaskProcessorFactory } from "../services/project-manager-task-processor-factory";
import { WebhookInvocation } from "../services/task-processor";
import { SafeExecute } from "@oliver/core";
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
		const unauthorizedResponse = getUnauthorizedResponse(req);
		if (unauthorizedResponse) {
			return unauthorizedResponse;
		}

		const [body, bodyError] = await SafeExecute.withSync(() => req.json()).execute();
		if (bodyError) {
			return NextResponse.json(
				{
					success: false,
					error: bodyError.message
				},
				{ status: 400 }
			);
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


export async function PATCH(req: NextRequest) {
	try {
		const unauthorizedResponse = getUnauthorizedResponse(req);
		if (unauthorizedResponse) {
			return unauthorizedResponse;
		}

		const jobId = req.nextUrl.searchParams.get("jobId")?.trim();
		if (!jobId) {
			return NextResponse.json(
				{
					success: false,
					error: "Missing jobId query parameter."
				},
				{ status: 400 }
			);
		}

		const [body, bodyError] = await SafeExecute.withSync(() => req.json()).execute();
		if (bodyError) {
			return NextResponse.json(
				{
					success: false,
					error: bodyError.message
				},
				{ status: 400 }
			);
		}

		const bodyRecord = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};
		const plan = typeof bodyRecord.plan === "string" ? bodyRecord.plan.trim() : "";
		const parsedResult = parseResultUpdate(bodyRecord.result);

		if (!plan && parsedResult === undefined) {
			return NextResponse.json(
				{
					success: false,
					error: "Request body must include at least one of: non-empty plan, result."
				},
				{ status: 400 }
			);
		}

		if (plan && parsedResult === null) {
			return NextResponse.json(
				{
					success: false,
					error: "Cannot combine plan with a null result update."
				},
				{ status: 400 }
			);
		}

		let resultToPersist: JobResult | null | undefined = parsedResult;
		if (plan) {
			if (parsedResult && parsedResult !== null) {
				resultToPersist = mergePlanIntoResult(parsedResult, plan);
			} else if (parsedResult === undefined) {
				resultToPersist = {
					success: true,
					message: "Plan updated.",
					data: {
						plan
					}
				};
			}
		}

		const runner = new ProjectManagerTaskProcessorFactory().getRunner();
		await runner.saveJob(jobId, {
			result: resultToPersist
		});

		return NextResponse.json(
			{
				success: true,
				jobId
			},
			{ status: 200 }
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected task plan update error.";
		return NextResponse.json(
			{
				success: false,
				error: message
			},
			{ status: 400 }
		);
	}
}
