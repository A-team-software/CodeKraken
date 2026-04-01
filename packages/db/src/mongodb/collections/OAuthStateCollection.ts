import { Collection } from "mongodb";
import { MongoConnectionManager } from "../client";
import { OAuthState } from "@oliver/core";

export class OAuthStateCollection {
    private static col: Collection<OAuthState> | null = null;
    private static initialized = false;

    static async get(): Promise<Collection<OAuthState>> {
        if (this.col && this.initialized) return this.col;

        const db = await MongoConnectionManager
            .getInstance()
            .connect();

        this.col = db.collection<OAuthState>("oauthStates");

        if (!this.initialized) {
            // Ensure indexes are created
            await Promise.all([
                this.col.createIndex(
                    { state: 1 },
                    { unique: true }
                ),
                // TTL index for automatic expiration
                this.col.createIndex(
                    { createdAt: 1 },
                    { expireAfterSeconds: 10 * 60 } // 10 minutes
                )
            ]);
            this.initialized = true;
        }

        return this.col;
    }
}
