import { Collection } from "mongodb";
import { MongoConnectionManager } from "../client";
import { AtlassianTenant } from "../models/AtlassianTenant.model";

export class AtlassianTenantCollection {
    private static collection: Collection<AtlassianTenant>;
    private static initialized = false;

    static async get(): Promise<Collection<AtlassianTenant>> {
        if (!this.collection) {
            const db = await MongoConnectionManager.getDb();
            this.collection = db.collection<AtlassianTenant>("atlassiantenants");
        }

        if (!this.initialized) {
            await this.ensureIndexes();
            this.initialized = true;
        }

        return this.collection;
    }

    private static async ensureIndexes() {
        await this.collection.createIndex({ clientKey: 1 }, { unique: true });
    }
}
