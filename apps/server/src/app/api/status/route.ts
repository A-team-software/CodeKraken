import { getDockerTunnelStatus } from "@/app/services/docker-tunnel";
import { MongoConnectionManager } from "@oliver/db";
import { ApiRes } from "@/utils/api_response";
import { wrapRoute } from "@/utils/api_handler";

export const GET = wrapRoute(async () => {
	if (process.env.IS_LOCAL_DOCKER !== "true") {
		return ApiRes.notFound("Not found");
	}

	const tunnel = getDockerTunnelStatus();

	let dbConnected = false;
	let dbError: string | null = null;

	try {
		const manager = MongoConnectionManager.getInstance();
		dbConnected = await manager.ping();
		if (!dbConnected) {
			dbError = "Database unavailable";
		}
	} catch (error) {
		dbError = "Database unavailable";
	}

	return ApiRes.success(
		{
			timestamp: new Date().toISOString(),
			tunnel,
			database: {
				connected: dbConnected,
				error: dbError,
			},
		},
		200,
		{
			headers: {
				"Cache-Control": "no-store",
			},
		}
	);
});
