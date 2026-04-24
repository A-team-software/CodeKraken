import { MongoConnectionManager } from "./db/mongodb/client";

export async function initializeDatabase(): Promise<boolean> {
    const manager =
        MongoConnectionManager.getInstance();

    await manager.connect();

    // Optional: verify DB health at startup
    const ok = await manager.ping();


    if (!ok) {
        return false;
    }

    console.log("✅ MongoDB ready");

    return true;
}
