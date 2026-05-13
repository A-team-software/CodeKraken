import { getDockerTunnelStatus } from "@/app/services/docker-tunnel";
import { MongoConnectionManager } from "@oliver/db";
import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
	const tunnel = getDockerTunnelStatus();

	let dbConnected = false;
	let dbError: string | null = null;

	try {
		const manager = MongoConnectionManager.getInstance();
		dbConnected = await manager.ping();
		if (!dbConnected) {
			dbError = "MongoDB ping failed";
		}
	} catch (error) {
		dbError = error instanceof Error ? error.message : "Unknown MongoDB error";
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
