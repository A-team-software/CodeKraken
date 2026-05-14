import { MongoConnectionManager } from "@oliver/db";

import { ConfigPersistenceLayer, TenantConfig } from "./config-persistence-layer";

interface TenantConfigDocument {
    _id?: string;
    tenantId?: string;
    clientKey?: string;
    incrementalPrsOn?: boolean;
}

export class MongoConfigPersistenceLayer implements ConfigPersistenceLayer {
    private static readonly collectionName = "tenant-configs";

    async getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
        const db = await MongoConnectionManager.getDb();
        const collection = db.collection<TenantConfigDocument>(MongoConfigPersistenceLayer.collectionName);
        const config = await collection.findOne({
            $or: [
                { _id: tenantId },
                { tenantId },
                { clientKey: tenantId }
            ]
        });

        if (!config) {
            return null;
        }

        return {
            incrementalPrsOn: config.incrementalPrsOn === true
        };
    }

    async updateTenantConfig(tenantId: string, config: Partial<TenantConfig>): Promise<void> {
        const db = await MongoConnectionManager.getDb();
        const collection = db.collection<TenantConfigDocument>(MongoConfigPersistenceLayer.collectionName);

        const updateDoc: any = {};
        if (config.incrementalPrsOn !== undefined) {
            updateDoc.incrementalPrsOn = config.incrementalPrsOn;
        }

        if (Object.keys(updateDoc).length === 0) {
            return;
        }

        await collection.updateOne(
            {
                $or: [
                    { _id: tenantId },
                    { tenantId },
                    { clientKey: tenantId }
                ]
            },
            {
                $set: updateDoc,
                $setOnInsert: { _id: tenantId, tenantId, clientKey: tenantId }
            },
            { upsert: true }
        );
    }
}