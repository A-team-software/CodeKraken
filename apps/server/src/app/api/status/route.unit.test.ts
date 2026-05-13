import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDockerTunnelStatusMock, pingMock, getInstanceMock } = vi.hoisted(() => {
	const getDockerTunnelStatus = vi.fn().mockReturnValue({
		enabled: true,
		started: true,
		hasToken: true,
		ngrokUrl: "oliver-ai.ngrok.io",
		port: 9977,
		error: null,
	});
	const ping = vi.fn().mockResolvedValue(true);
	const getInstance = vi.fn().mockReturnValue({ ping });

	return {
		getDockerTunnelStatusMock: getDockerTunnelStatus,
		pingMock: ping,
		getInstanceMock: getInstance,
	};
});

vi.mock("@/app/services/docker-tunnel", () => ({
	getDockerTunnelStatus: getDockerTunnelStatusMock,
}));

vi.mock("@oliver/db", () => ({
	MongoConnectionManager: {
		getInstance: getInstanceMock,
	},
}));

import { GET } from "./route";

const ORIGINAL_ENV = { ...process.env };

describe("GET /api/status", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...ORIGINAL_ENV };
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
	});

	it("returns 404 when not in local docker mode", async () => {
		process.env.IS_LOCAL_DOCKER = "false";

		const response = await GET();
		const payload = await response.json();

		expect(response.status).toBe(404);
		expect(payload).toEqual({ error: "Not found" });
		expect(getDockerTunnelStatusMock).not.toHaveBeenCalled();
	});

	it("returns status payload with tunnel and database connectivity", async () => {
		process.env.IS_LOCAL_DOCKER = "true";
		pingMock.mockResolvedValueOnce(true);

		const response = await GET();
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(payload).toEqual(
			expect.objectContaining({
				timestamp: expect.any(String),
				tunnel: expect.objectContaining({
					enabled: true,
					started: true,
				}),
				database: {
					connected: true,
					error: null,
				},
			}),
		);
	});

	it("returns sanitized database error state when ping fails", async () => {
		process.env.IS_LOCAL_DOCKER = "true";
		pingMock.mockResolvedValueOnce(false);

		const response = await GET();
		const payload = await response.json();

		expect(response.status).toBe(200);
		expect(payload.database).toEqual({
			connected: false,
			error: "Database unavailable",
		});
	});
});
