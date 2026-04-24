import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GcpInfrastructure } from "../../infrastructure/gcp/index";
import { OpenCodeRunner } from "./index";

type MockFetchResponseOptions = {
    ok: boolean;
    status: number;
    statusText: string;
    body?: unknown;
};

const ORIGINAL_ENV = { ...process.env };

describe("OpenCodeRunner with GcpInfrastructure", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        process.env = { ...ORIGINAL_ENV };
        delete process.env.GCP_RUN_JOB_NAME;
        delete process.env.GCP_PROJECT_ID;
        delete process.env.GCP_RUN_LOCATION;
        delete process.env.GCP_REGION;
        delete process.env.GCP_ACCESS_TOKEN;
        delete process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
        delete process.env.GOOGLE_ACCESS_TOKEN;
        delete process.env.GCP_RUN_CONTAINER_NAME;
        delete process.env.GCP_RUN_OPERATION_NAME;
        delete process.env.GCP_OPERATION_NAME;
        delete process.env.RUN_OPERATION_NAME;
        delete process.env.AI_PROVIDER;
        delete process.env.AI_API_KEY;
        delete process.env.OPENCODE_AI_PROVIDER;
        delete process.env.OPENCODE_AI_API_KEY;
        delete process.env.GIT_USERNAME;
        delete process.env.GIT_PASSWORD;
        delete process.env.GIT_TOKEN;
        delete process.env.WORKSPACE_DIR;
        delete process.env.OPENCODE_FLAGS;
        delete process.env.OPENCODE_COMMAND;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        process.env = { ...ORIGINAL_ENV };
    });

    it("starts a Cloud Run job successfully using a full job resource name", async () => {
        process.env.GCP_RUN_JOB_NAME = "projects/demo-project/locations/europe-west1/jobs/opencode-job";
        process.env.GCP_ACCESS_TOKEN = "test-access-token";
        process.env.GCP_RUN_CONTAINER_NAME = "worker";
        process.env.AI_PROVIDER = "openai";
        process.env.AI_API_KEY = "provider-key";
        process.env.GIT_USERNAME = "git-user";
        process.env.GIT_PASSWORD = "git-password";

        const fetchMock = vi.fn().mockResolvedValue(
            createFetchResponse({
                ok: true,
                status: 200,
                statusText: "OK",
                body: { name: "projects/demo-project/locations/europe-west1/operations/op-123" }
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const result = await runner.start({
            repoUrl: "https://github.com/example/repo.git",
            mode: "agent",
            task: "Build a hello world app",
            branch: "feature/demo",
            commitHash: "abc123"
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain("started successfully");
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe(
            "https://run.googleapis.com/v2/projects/demo-project/locations/europe-west1/jobs/opencode-job:run"
        );
        expect(init.method).toBe("POST");
        expect(init.headers).toMatchObject({
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json"
        });

        const body = JSON.parse(String(init.body)) as {
            overrides: { containerOverrides: Array<{ name?: string; env: Array<{ name: string; value: string }> }> };
        };

        expect(body.overrides.containerOverrides[0].name).toBe("worker");
        expect(body.overrides.containerOverrides[0].env).toEqual(
            expect.arrayContaining([
                { name: "REPO_URL", value: "https://github.com/example/repo.git" },
                { name: "JOB_MODE", value: "agent" },
                { name: "TASK", value: "Build a hello world app" },
                { name: "BRANCH", value: "feature/demo" },
                { name: "COMMIT_HASH", value: "abc123" },
                { name: "AI_PROVIDER", value: "openai" },
                { name: "AI_API_KEY", value: "provider-key" },
                { name: "GIT_USERNAME", value: "git-user" },
                { name: "GIT_PASSWORD", value: "git-password" }
            ])
        );
        expect(result.data?.operationName).toBe("projects/demo-project/locations/europe-west1/operations/op-123");
    });

    it("starts a Cloud Run job successfully using short job name plus project and location", async () => {
        process.env.GCP_RUN_JOB_NAME = "opencode-job";
        process.env.GCP_PROJECT_ID = "demo-project";
        process.env.GCP_RUN_LOCATION = "us-central1";
        process.env.GOOGLE_ACCESS_TOKEN = "alt-access-token";

        const fetchMock = vi.fn().mockResolvedValue(
            createFetchResponse({
                ok: true,
                status: 200,
                statusText: "OK",
                body: { name: "projects/demo-project/locations/us-central1/operations/op-456" }
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const result = await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "plan",
            task: "Plan the work"
        });

        expect(result.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://run.googleapis.com/v2/projects/demo-project/locations/us-central1/jobs/opencode-job:run",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("returns an error when GCP_RUN_JOB_NAME is missing", async () => {
        process.env.GCP_ACCESS_TOKEN = "test-access-token";
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const result = await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "agent",
            task: "Build something"
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe("Missing required environment variable: GCP_RUN_JOB_NAME");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns an error when access token is missing", async () => {
        process.env.GCP_RUN_JOB_NAME = "projects/demo-project/locations/us-central1/jobs/opencode-job";
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const result = await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "agent",
            task: "Build something"
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain("Missing access token");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns an error when the Cloud Run run API fails", async () => {
        process.env.GCP_RUN_JOB_NAME = "projects/demo-project/locations/us-central1/jobs/opencode-job";
        process.env.GCP_ACCESS_TOKEN = "test-access-token";

        const fetchMock = vi.fn().mockResolvedValue(
            createFetchResponse({
                ok: false,
                status: 403,
                statusText: "Forbidden",
                body: { error: { message: "permission denied" } }
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const result = await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "agent",
            task: "Build something"
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain("HTTP 403");
        expect(result.data?.response).toEqual({ error: { message: "permission denied" } });
    });

    it("stops a Cloud Run operation successfully using the operation returned by start", async () => {
        process.env.GCP_RUN_JOB_NAME = "projects/demo-project/locations/us-central1/jobs/opencode-job";
        process.env.GCP_ACCESS_TOKEN = "test-access-token";

        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                createFetchResponse({
                    ok: true,
                    status: 200,
                    statusText: "OK",
                    body: { name: "projects/demo-project/locations/us-central1/operations/op-789" }
                })
            )
            .mockResolvedValueOnce(
                createFetchResponse({
                    ok: true,
                    status: 200,
                    statusText: "OK",
                    body: { done: true }
                })
            );
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        await runner.start({
            repoUrl: "https://example.com/repo.git",
            mode: "agent",
            task: "Build something"
        });
        const stopResult = await runner.stop();

        expect(stopResult.success).toBe(true);
        expect(stopResult.message).toContain("stop request sent successfully");
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "https://run.googleapis.com/v2/projects/demo-project/locations/us-central1/operations/op-789",
            expect.objectContaining({ method: "DELETE" })
        );
    });

    it("stops a Cloud Run operation successfully using environment fallback", async () => {
        process.env.GCP_ACCESS_TOKEN = "test-access-token";
        process.env.GCP_RUN_OPERATION_NAME = "projects/demo-project/locations/us-central1/operations/op-env";

        const fetchMock = vi.fn().mockResolvedValue(
            createFetchResponse({
                ok: true,
                status: 200,
                statusText: "OK",
                body: { done: true }
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const stopResult = await runner.stop();

        expect(stopResult.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://run.googleapis.com/v2/projects/demo-project/locations/us-central1/operations/op-env",
            expect.objectContaining({ method: "DELETE" })
        );
    });

    it("returns an error when stop is requested without an operation name", async () => {
        process.env.GCP_ACCESS_TOKEN = "test-access-token";
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const stopResult = await runner.stop();

        expect(stopResult.success).toBe(false);
        expect(stopResult.message).toContain("Missing operation name for stopProcess");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("returns an error when the Cloud Run operation delete API fails", async () => {
        process.env.GCP_ACCESS_TOKEN = "test-access-token";
        process.env.GCP_RUN_OPERATION_NAME = "projects/demo-project/locations/us-central1/operations/op-fail";

        const fetchMock = vi.fn().mockResolvedValue(
            createFetchResponse({
                ok: false,
                status: 404,
                statusText: "Not Found",
                body: { error: { message: "operation not found" } }
            })
        );
        vi.stubGlobal("fetch", fetchMock);

        const runner = new OpenCodeRunner(new GcpInfrastructure());
        const stopResult = await runner.stop();

        expect(stopResult.success).toBe(false);
        expect(stopResult.message).toContain("HTTP 404");
        expect(stopResult.data?.response).toEqual({ error: { message: "operation not found" } });
    });
});

function createFetchResponse(options: MockFetchResponseOptions): Response {
    return {
        ok: options.ok,
        status: options.status,
        statusText: options.statusText,
        text: vi.fn().mockResolvedValue(options.body === undefined ? "" : JSON.stringify(options.body))
    } as unknown as Response;
}
