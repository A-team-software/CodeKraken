import { Infrastructure } from "../infrastructure";
import { JobConfig, JobResult } from "../../shared";

type CloudRunEnvVar = {
    name: string;
    value: string;
};

type CloudRunRunRequestBody = {
    overrides?: {
        containerOverrides?: Array<{
            name?: string;
            env?: CloudRunEnvVar[];
        }>;
    };
};

type CloudRunOperation = {
    name?: string;
};

export class GcpInfrastructure implements Infrastructure {
    private lastOperationName?: string;

    async startProcess(options: JobConfig): Promise<JobResult> {
        try {
            const runJobName = process.env.GCP_RUN_JOB_NAME?.trim();
            if (!runJobName) {
                throw new Error("Missing required environment variable: GCP_RUN_JOB_NAME");
            }

            const accessToken = this.resolveAccessToken();
            const endpoint = this.buildRunEndpoint(runJobName);
            const body = this.buildRunRequestBody(options);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const text = await response.text();
            const data = this.safeJsonParse(text);
            const operationName = this.extractOperationName(data);

            if (operationName) {
                this.lastOperationName = operationName;
            }

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to run Cloud Run job. HTTP ${response.status}: ${response.statusText}`,
                    data: {
                        endpoint,
                        status: response.status,
                        statusText: response.statusText,
                        response: data ?? text
                    }
                };
            }

            return {
                success: true,
                message: "Cloud Run job execution started successfully.",
                data: {
                    endpoint,
                    operationName,
                    response: data ?? text
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown GCP infrastructure error."
            };
        }
    }

    async stopProcess(): Promise<JobResult> {
        try {
            const operationName = this.resolveOperationName();
            const endpoint = this.buildOperationDeleteEndpoint(operationName);
            const accessToken = this.resolveAccessToken();

            const response = await fetch(endpoint, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            const text = await response.text();
            const data = this.safeJsonParse(text);

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to stop Cloud Run operation. HTTP ${response.status}: ${response.statusText}`,
                    data: {
                        endpoint,
                        operationName,
                        status: response.status,
                        statusText: response.statusText,
                        response: data ?? text
                    }
                };
            }

            this.lastOperationName = undefined;

            return {
                success: true,
                message: "Cloud Run operation stop request sent successfully.",
                data: {
                    endpoint,
                    operationName,
                    response: data ?? text
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Unknown GCP stop error."
            };
        }
    }

    async pauseProcess(): Promise<JobResult> {
        return {
            success: false,
            message: "Pausing GCP Cloud Run jobs is not supported."
        };
    }

    async resumeProcess(): Promise<JobResult> {
        return {
            success: false,
            message: "Resuming GCP Cloud Run jobs is not supported."
        };
    }

    private resolveAccessToken(): string {
        const token =
            process.env.GCP_ACCESS_TOKEN?.trim() ||
            process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim() ||
            process.env.GOOGLE_ACCESS_TOKEN?.trim();

        if (!token) {
            throw new Error(
                "Missing access token. Set one of: GCP_ACCESS_TOKEN, GOOGLE_OAUTH_ACCESS_TOKEN, GOOGLE_ACCESS_TOKEN."
            );
        }

        return token;
    }

    private buildRunEndpoint(runJobName: string): string {
        if (runJobName.includes("/jobs/")) {
            return `https://run.googleapis.com/v2/${runJobName}:run`;
        }

        const projectId = process.env.GCP_PROJECT_ID?.trim();
        const location = process.env.GCP_RUN_LOCATION?.trim() || process.env.GCP_REGION?.trim();

        if (!projectId || !location) {
            throw new Error(
                "GCP_RUN_JOB_NAME is not a full resource name. Set GCP_PROJECT_ID and GCP_RUN_LOCATION (or GCP_REGION)."
            );
        }

        return `https://run.googleapis.com/v2/projects/${projectId}/locations/${location}/jobs/${runJobName}:run`;
    }

    private buildRunRequestBody(options: JobConfig): CloudRunRunRequestBody {
        const env = this.buildRunnerEnv(options);
        const containerName = process.env.GCP_RUN_CONTAINER_NAME?.trim();

        return {
            overrides: {
                containerOverrides: [
                    {
                        ...(containerName ? { name: containerName } : {}),
                        env
                    }
                ]
            }
        };
    }

    private resolveOperationName(): string {
        const operationName =
            this.lastOperationName ||
            process.env.GCP_RUN_OPERATION_NAME?.trim() ||
            process.env.GCP_OPERATION_NAME?.trim() ||
            process.env.RUN_OPERATION_NAME?.trim();

        if (!operationName) {
            throw new Error(
                "Missing operation name for stopProcess. Ensure startProcess was called first or set GCP_RUN_OPERATION_NAME."
            );
        }

        return operationName;
    }

    private buildOperationDeleteEndpoint(operationName: string): string {
        if (operationName.startsWith("https://")) {
            return operationName;
        }

        if (operationName.includes("/operations/")) {
            return `https://run.googleapis.com/v2/${operationName}`;
        }

        const projectId = process.env.GCP_PROJECT_ID?.trim();
        const location = process.env.GCP_RUN_LOCATION?.trim() || process.env.GCP_REGION?.trim();

        if (!projectId || !location) {
            throw new Error(
                "Operation name is not a full resource. Set GCP_PROJECT_ID and GCP_RUN_LOCATION (or GCP_REGION), or pass a full operation name."
            );
        }

        return `https://run.googleapis.com/v2/projects/${projectId}/locations/${location}/operations/${operationName}`;
    }

    private buildRunnerEnv(options: JobConfig): CloudRunEnvVar[] {
        const env: Record<string, string> = {
            REPO_URL: options.repoUrl,
            JOB_MODE: options.mode,
            ...(options.task ? { TASK: options.task } : {}),
            ...(options.branch ? { BRANCH: options.branch } : {}),
            ...(options.commitHash ? { COMMIT_HASH: options.commitHash } : {})
        };

        this.copyIfSet(env, "AI_PROVIDER", ["AI_PROVIDER", "OPENCODE_AI_PROVIDER"]);
        this.copyIfSet(env, "AI_API_KEY", ["AI_API_KEY", "OPENCODE_AI_API_KEY", "LLM_API_KEY"]);
        this.copyIfSet(env, "GIT_USERNAME", ["GIT_USERNAME", "GIT_USER"]);
        this.copyIfSet(env, "GIT_PASSWORD", ["GIT_PASSWORD", "GIT_PASS"]);
        this.copyIfSet(env, "GIT_TOKEN", ["GIT_TOKEN", "GITHUB_TOKEN", "GIT_ACCESS_TOKEN"]);
        this.copyIfSet(env, "WORKSPACE_DIR", ["WORKSPACE_DIR", "POD_WORKDIR"]);
        this.copyIfSet(env, "OPENCODE_FLAGS", ["OPENCODE_FLAGS"]);
        this.copyIfSet(env, "OPENCODE_COMMAND", ["OPENCODE_COMMAND"]);

        return Object.entries(env).map(([name, value]) => ({
            name,
            value
        }));
    }

    private copyIfSet(target: Record<string, string>, targetName: string, sourceNames: string[]): void {
        for (const source of sourceNames) {
            const value = process.env[source]?.trim();
            if (value) {
                target[targetName] = value;
                return;
            }
        }
    }

    private safeJsonParse(value: string): unknown {
        try {
            return JSON.parse(value);
        } catch {
            return undefined;
        }
    }

    private extractOperationName(value: unknown): string | undefined {
        if (!value || typeof value !== "object") {
            return undefined;
        }

        const operation = value as CloudRunOperation;
        return typeof operation.name === "string" && operation.name.length > 0 ? operation.name : undefined;
    }
}
