import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getTenantConfigMock, updateTenantConfigMock } = vi.hoisted(() => ({
    getTenantConfigMock: vi.fn(),
    updateTenantConfigMock: vi.fn()
}));

vi.mock("@/app/brain/runner/mongo-config-persistence-layer", () => {
    return {
        MongoConfigPersistenceLayer: class {
            getTenantConfig = getTenantConfigMock;
            updateTenantConfig = updateTenantConfigMock;
        }
    };
});

import { GET, POST } from "./route";

const ORIGINAL_ENV = { ...process.env };

describe("Forge Config API Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env = { ...ORIGINAL_ENV };
        process.env.API_SECRET = "test-secret";
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
    });

    describe("GET /api/forge/config", () => {
        it("returns 401 if unauthorized", async () => {
            const req = new NextRequest("http://localhost/api/forge/config", {
                headers: { authorization: "Bearer wrong-secret" }
            });
            const res = await GET(req);
            expect(res.status).toBe(401);
        });

        it("returns 400 if missing client key", async () => {
            const req = new NextRequest("http://localhost/api/forge/config", {
                headers: { authorization: "Bearer test-secret" }
            });
            const res = await GET(req);
            expect(res.status).toBe(400);
        });

        it("returns config successfully", async () => {
            const req = new NextRequest("http://localhost/api/forge/config", {
                headers: { 
                    authorization: "Bearer test-secret",
                    "X-Forge-Client-Key": "client-1"
                }
            });
            getTenantConfigMock.mockResolvedValueOnce({ incrementalPrsOn: true });

            const res = await GET(req);
            expect(res.status).toBe(200);
            
            const data = await res.json();
            expect(data).toEqual({ config: { incrementalPrsOn: true } });
            expect(getTenantConfigMock).toHaveBeenCalledWith("client-1");
        });
    });

    describe("POST /api/forge/config", () => {
        it("returns 401 if unauthorized", async () => {
            const req = new NextRequest("http://localhost/api/forge/config", {
                method: "POST",
                headers: { authorization: "Bearer wrong-secret" }
            });
            const res = await POST(req);
            expect(res.status).toBe(401);
        });

        it("returns 400 if invalid boolean provided", async () => {
            const req = new NextRequest("http://localhost/api/forge/config", {
                method: "POST",
                headers: { 
                    authorization: "Bearer test-secret",
                    "X-Forge-Client-Key": "client-1",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ incrementalPrsOn: "yes" })
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
        });

        it("updates config successfully", async () => {
            const req = new NextRequest("http://localhost/api/forge/config", {
                method: "POST",
                headers: { 
                    authorization: "Bearer test-secret",
                    "X-Forge-Client-Key": "client-1",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ incrementalPrsOn: true })
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data).toEqual({ success: true, config: { incrementalPrsOn: true } });
            expect(updateTenantConfigMock).toHaveBeenCalledWith("client-1", { incrementalPrsOn: true });
        });
    });
});
