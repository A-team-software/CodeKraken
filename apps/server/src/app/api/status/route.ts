import { getDockerTunnelStatus } from "@/app/services/docker-tunnel";
import { MongoConnectionManager } from "@oliver/db";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
	if (process.env.IS_LOCAL_DOCKER !== "true") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
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

	return NextResponse.json(
		{
			timestamp: new Date().toISOString(),
			tunnel,
			database: {
				connected: dbConnected,
				error: dbError,
			},
		},
		{
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}
