import { RunnerTaskConfig } from "../../services/base-project-manager-task-processor";
import { ProjectManagerTaskProcessorFactory } from "../../services/project-manager-task-processor-factory";
import { WebhookInvocation } from "../../services/task-processor";
import { MongoJobPersistenceLayer } from "@/brain/runner/mongo-job-persistence-layer";
import { OpenCodeRunner } from "@/brain/runner/opencode";
import { JobResult } from "@/brain/shared";
import { SafeExecute } from "@oliver/core";
import { NextRequest, NextResponse } from "next/server";

function unauthorizedResponse(): NextResponse {
	return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

function readConfiguredApiToken(): string {
	return process.env.OPENCODE_TASK_API_TOKEN || process.env.TASK_API_TOKEN || process.env.API_KEY || "";
}

function isUnauthenticatedAccessAllowed(): boolean {
	return process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED !== "false";
}

function extractBasicAuthPassword(authorizationHeader: string): string | null {
	if (!authorizationHeader.startsWith("Basic ")) {
		return null;
	}

	try {
		const decoded = Buffer.from(authorizationHeader.slice("Basic ".length), "base64").toString("utf8");
		const separatorIndex = decoded.indexOf(":");
		if (separatorIndex === -1) {
			return null;
		}

		return decoded.slice(separatorIndex + 1);
	} catch {
		return null;
	}
}

function getUnauthorizedResponse(req: NextRequest): NextResponse | null {
	if (isUnauthenticatedAccessAllowed()) {
		return null;
	}

	const configuredToken = readConfiguredApiToken();
	if (!configuredToken) {
		return unauthorizedResponse();
	}

	const authorizationHeader = req.headers.get("authorization") || "";
	if (authorizationHeader === `Bearer ${configuredToken}`) {
		return null;
	}

	const basicPassword = extractBasicAuthPassword(authorizationHeader);
	if (basicPassword === configuredToken) {
		return null;
	}

	return unauthorizedResponse();
}

function parseResultUpdate(value: unknown): JobResult | null | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	if (typeof value !== "object" || Array.isArray(value)) {
		throw new Error("result field must be an object or null.");
	}

	const record = value as Record<string, unknown>;
	if (typeof record.success !== "boolean") {
		throw new Error("result field must include a boolean success property.");
	}

	if (record.message !== undefined && typeof record.message !== "string") {
		throw new Error("result field message must be a string when provided.");
	}

	return {
		success: record.success,
		message: typeof record.message === "string" ? record.message : undefined,
		data: record.data
	};
}

function mergePlanIntoResult(result: JobResult, plan: string): JobResult {
	const existingData = result.data;
	const data = existingData && typeof existingData === "object" && !Array.isArray(existingData)
		? { ...(existingData as Record<string, unknown>), plan }
		: { plan };

	return {
		...result,
		data
	};
}

function parseOptionalPlan(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new Error("plan field must be a string when provided.");
	}

	const plan = value.trim();
	return plan.length > 0 ? plan : undefined;
}

function parseOptionalPrId(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new Error("prId field must be a string when provided.");
	}

	const prId = value.trim();
	return prId.length > 0 ? prId : undefined;
}

function parseOptionalJobId(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new Error("jobId field must be a string when provided.");
	}

	const jobId = value.trim();
	return jobId.length > 0 ? jobId : undefined;
}

function parseOptionalTodoItemId(value: unknown): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (typeof value !== "string") {
		throw new Error("todoItemId field must be a string when provided.");
	}

	const todoItemId = value.trim();
	return todoItemId.length > 0 ? todoItemId : undefined;
}

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

export async function PATCH(req: NextRequest) {
	try {
		const unauthorized = getUnauthorizedResponse(req);
		if (unauthorized) {
			return unauthorized;
		}

		const jobId = req.nextUrl.searchParams.get("jobId")?.trim();
		if (!jobId) {
			return NextResponse.json({ success: false, error: "Missing jobId query parameter." }, { status: 400 });
		}

		const [body, bodyError] = await SafeExecute.withSync(async () => req.json()).execute();
		if (bodyError) {
			return NextResponse.json({ success: false, error: bodyError.message || "Invalid request body." }, { status: 400 });
		}

		const bodyRecord = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};
		const [parsed, parseError] = await SafeExecute.withSync(async () => {
			const plan = parseOptionalPlan(bodyRecord.plan);
			const prId = parseOptionalPrId(bodyRecord.prId);
			const payloadJobId = parseOptionalJobId(bodyRecord.jobId);
			const rawTodoItemId = parseOptionalTodoItemId(bodyRecord.todoItemId);
			let result = parseResultUpdate(bodyRecord.result);

			if (payloadJobId && payloadJobId !== jobId) {
				throw new Error("jobId in request body must match jobId query parameter when provided.");
			}

			if (result === undefined && plan === undefined && prId === undefined) {
				throw new Error("Request body must include at least one of: non-empty plan, prId, result.");
			}

			if (result === null && plan !== undefined) {
				throw new Error("Cannot combine plan with a null result update.");
			}

			if (result === undefined) {
				result = {
					success: true,
					message: "Job metadata updated.",
					data: {
						...(plan ? { plan } : {}),
						...(prId ? { prId } : {}),
						...((rawTodoItemId ?? (plan && !prId ? "plan" : undefined)) ? { todoItemId: rawTodoItemId ?? "plan" } : {})
					}
				};
			} else if (plan !== undefined && result) {
				result = mergePlanIntoResult(result, plan);
			}

			const todoItemId = rawTodoItemId ?? (plan && !prId ? "plan" : undefined);

			return {
				plan,
				prId,
				todoItemId,
				payloadJobId,
				result
			};
		}).execute();

		if (parseError || !parsed) {
			return NextResponse.json({ success: false, error: parseError?.message || "Invalid patch payload." }, { status: 400 });
		}

		const [_, saveError] = await SafeExecute.withSync(async () => {
			const persistenceLayer = new MongoJobPersistenceLayer();
			await persistenceLayer.saveJob(jobId, {
				result: parsed.result,
				plan: parsed.plan,
				prId: parsed.prId,
				todoItemId: parsed.todoItemId
			});
		}).execute();

		if (saveError) {
			return NextResponse.json({ success: false, error: saveError.message || "Failed to persist job update." }, { status: 400 });
		}

		if (parsed.plan && !parsed.prId) {
			const [startResult, startError] = await SafeExecute.withSync(async () => {
				const runner = new OpenCodeRunner();
				return runner.startNextIteration(undefined, undefined, jobId);
			}).execute();

			if (startError || !startResult?.success) {
				console.warn("PATCH /api/task: next iteration start was attempted but did not complete successfully.", {
					jobId,
					error: startError?.message,
					message: startResult?.message
				});
			}
		}

		return NextResponse.json({ success: true, jobId });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected task patch processing error.";
		return NextResponse.json({ success: false, error: message }, { status: 400 });
	}
}
