import { Collection } from "mongodb";
import { MongoConnectionManager } from "../client";
import { ForgeSession } from "@oliver/core";

export class ForgeSessionCollection {
    private static col: Collection<ForgeSession> | null = null;
    private static initialized = false;

    static async get(): Promise<Collection<ForgeSession>> {
        if (this.col && this.initialized) return this.col;

        const db = await MongoConnectionManager
            .getInstance()
            .connect();

        this.col = db.collection<ForgeSession>("forgeSessions");

        if (!this.initialized) {
            await Promise.all([
                // Unique index on token for fast lookup
                this.col.createIndex(
                    { token: 1 },
                    { unique: true }
                ),
                // TTL index — MongoDB auto-deletes documents 5 minutes after createdAt
                this.col.createIndex(
                    { createdAt: 1 },
                    { expireAfterSeconds: 5 * 60 }
                ),
            ]);
            this.initialized = true;
        }

        return this.col;
    }
}
