import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    createIndexMock,
    updateOneMock,
    collectionFactoryMock,
    getDbMock
} = vi.hoisted(() => {
    const createIndex = vi.fn().mockResolvedValue("updatedAt_desc");
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });
    const collection = {
        createIndex,
        updateOne,
        findOne: vi.fn(),
        deleteOne: vi.fn()
    };
    const collectionFactory = vi.fn().mockReturnValue(collection);
    const getDb = vi.fn().mockResolvedValue({
        collection: collectionFactory
    });

    return {
        createIndexMock: createIndex,
        updateOneMock: updateOne,
        collectionFactoryMock: collectionFactory,
        getDbMock: getDb
    };
});

vi.mock("@oliver/db", () => ({
    MongoConnectionManager: {
        getDb: getDbMock
    }
}));

vi.mock("@oliver/core", () => ({
    SafeExecute: {
        withSync: (fn: () => unknown | Promise<unknown>) => ({
            execute: async () => {
                try {
                    return [await fn(), null] as const;
                } catch (error) {
                    return [undefined, error as Error] as const;
                }
            }
        })
    }
}));

import { PATCH } from "./route";

const ORIGINAL_ENV = { ...process.env };

type RequestOptions = {
    body?: unknown;
    rawBody?: string;
    headers?: Record<string, string>;
    query?: string;
};

function createPatchRequest(options: RequestOptions = {}): NextRequest {
    const query = options.query ?? "jobId=job-123";
    const url = `http://localhost:3000/api/task?${query}`;

    const headers: Record<string, string> = {
        "content-type": "application/json",
        ...(options.headers ?? {})
    };

    const body = options.rawBody ?? JSON.stringify(options.body ?? { plan: "Initial plan" });

    return new NextRequest(url, {
        method: "PATCH",
        headers,
        body
    });
}

async function parseResponse(response: Response): Promise<any> {
    return response.json();
}

describe("PATCH /api/task", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
        process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED = "true";
        delete process.env.OPENCODE_TASK_API_TOKEN;
        delete process.env.API_KEY;
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    it("returns 401 when auth is required and no token is configured", async () => {
        process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED = "false";

        const response = await PATCH(createPatchRequest());
        const payload = await parseResponse(response);

        expect(response.status).toBe(401);
        expect(payload).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns 401 when bearer token is invalid", async () => {
        process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED = "false";
        process.env.OPENCODE_TASK_API_TOKEN = "expected-token";

        const response = await PATCH(createPatchRequest({
            headers: { authorization: "Bearer wrong-token" }
        }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(401);
        expect(payload).toEqual({ success: false, error: "Unauthorized" });
    });

    it("accepts basic auth password when configured token is API_KEY", async () => {
        process.env.OPENCODE_TASK_API_ALLOW_UNAUTHENTICATED = "false";
        process.env.API_KEY = "secret-key";

        const basic = Buffer.from(":secret-key").toString("base64");
        const response = await PATCH(createPatchRequest({
            headers: { authorization: `Basic ${basic}` }
        }));

        expect(response.status).toBe(200);
        expect(updateOneMock).toHaveBeenCalledTimes(1);
    });

    it("returns 400 when jobId query parameter is missing", async () => {
        const response = await PATCH(createPatchRequest({ query: "provider=jira" }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(payload.error).toBe("Missing jobId query parameter.");
        expect(updateOneMock).not.toHaveBeenCalled();
    });

    it("returns 400 when request body is invalid JSON", async () => {
        const response = await PATCH(createPatchRequest({ rawBody: "{" }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(typeof payload.error).toBe("string");
        expect(updateOneMock).not.toHaveBeenCalled();
    });

    it("returns 400 when neither plan nor result is provided", async () => {
        const response = await PATCH(createPatchRequest({ body: {} }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(payload.error).toBe("Request body must include at least one of: non-empty plan, result.");
        expect(updateOneMock).not.toHaveBeenCalled();
    });

    it("returns 400 when result is invalid type", async () => {
        const response = await PATCH(createPatchRequest({ body: { result: "bad" } }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(payload.error).toContain("result field must be an object or null");
        expect(updateOneMock).not.toHaveBeenCalled();
    });

    it("returns 400 when result object misses success boolean", async () => {
        const response = await PATCH(createPatchRequest({
            body: {
                result: { message: "no success" }
            }
        }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(payload.error).toContain("boolean success");
        expect(updateOneMock).not.toHaveBeenCalled();
    });

    it("returns 400 when plan is combined with null result", async () => {
        const response = await PATCH(createPatchRequest({
            body: {
                plan: "x",
                result: null
            }
        }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(payload.error).toBe("Cannot combine plan with a null result update.");
        expect(updateOneMock).not.toHaveBeenCalled();
    });

    it("persists generated result when only plan is provided", async () => {
        const response = await PATCH(createPatchRequest({
            body: {
                plan: "Plan from .plans"
            }
        }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(payload).toEqual({ success: true, jobId: "job-123" });
        expect(collectionFactoryMock).toHaveBeenCalledWith("runner_jobs");
        expect(updateOneMock).toHaveBeenCalledWith(
            { _id: "job-123" },
            expect.objectContaining({
                $set: expect.objectContaining({
                    result: {
                        success: true,
                        message: "Plan updated.",
                        data: { plan: "Plan from .plans" }
                    }
                })
            }),
            { upsert: true }
        );
    });

    it("persists provided result when result is supplied without plan", async () => {
        const response = await PATCH(createPatchRequest({
            body: {
                result: {
                    success: false,
                    message: "Execution failed",
                    data: { exitCode: 1 }
                }
            }
        }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(200);
        expect(payload).toEqual({ success: true, jobId: "job-123" });
        expect(updateOneMock).toHaveBeenCalledWith(
            { _id: "job-123" },
            expect.objectContaining({
                $set: expect.objectContaining({
                    result: {
                        success: false,
                        message: "Execution failed",
                        data: { exitCode: 1 }
                    }
                })
            }),
            { upsert: true }
        );
    });

    it("merges plan into existing result.data when both plan and result are provided", async () => {
        const response = await PATCH(createPatchRequest({
            body: {
                plan: "Final approved plan",
                result: {
                    success: true,
                    message: "Ready",
                    data: { origin: "agent" }
                }
            }
        }));

        expect(response.status).toBe(200);
        expect(updateOneMock).toHaveBeenCalledWith(
            { _id: "job-123" },
            expect.objectContaining({
                $set: expect.objectContaining({
                    result: {
                        success: true,
                        message: "Ready",
                        data: {
                            origin: "agent",
                            plan: "Final approved plan"
                        }
                    }
                })
            }),
            { upsert: true }
        );
    });

    it("allows setting result to null without a plan", async () => {
        const response = await PATCH(createPatchRequest({
            body: {
                result: null
            }
        }));

        expect(response.status).toBe(200);
        expect(updateOneMock).toHaveBeenCalledWith(
            { _id: "job-123" },
            expect.objectContaining({
                $set: expect.objectContaining({
                    result: null
                })
            }),
            { upsert: true }
        );
    });

    it("returns 400 when persistence fails", async () => {
        updateOneMock.mockRejectedValueOnce(new Error("db down"));

        const response = await PATCH(createPatchRequest({ body: { plan: "x" } }));
        const payload = await parseResponse(response);

        expect(response.status).toBe(400);
        expect(payload.error).toBe("db down");
    });
});
