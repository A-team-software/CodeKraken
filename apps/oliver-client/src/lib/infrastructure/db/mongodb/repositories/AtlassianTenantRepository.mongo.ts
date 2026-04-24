import { AtlassianTenant, PlainAtlassianTenant } from '../models/AtlassianTenant.model';
import { AtlassianTenantCollection } from '../collections/AtlassianTenantCollection';
import { AtlassianTenantRepository } from '@/lib/domains/atlassian/repository/AtlassianTenantRepository.interface';

export class MongoAtlassianTenantRepository implements AtlassianTenantRepository {

    async findByClientKey(clientKey: string): Promise<PlainAtlassianTenant | null> {
        const collection = await AtlassianTenantCollection.get();
        const doc = await collection.findOne({ clientKey });

        if (!doc) {
            return null;
        }
        return this.mapTenant(doc);
    }

    async upsert(tenantData: {
        key: string;
        clientKey: string;
        sharedSecret: string;
        baseUrl: string;
        productType: string;
        cloudId?: string;
        description?: string;
        eventType?: string;
    }): Promise<PlainAtlassianTenant> {
        const collection = await AtlassianTenantCollection.get();
        const { clientKey, sharedSecret, ...otherFields } = tenantData;

        // Ensure sharedSecret is plain
        const encryptedSecret = sharedSecret;

        const result = await collection.findOneAndUpdate(
            { clientKey },
            {
                $set: {
                    ...otherFields,
                    sharedSecret: encryptedSecret,
                    updatedAt: new Date(),
                },
                $setOnInsert: {
                    createdAt: new Date(),
                }
            },
            {
                upsert: true,
                returnDocument: 'after',
            }
        );

        if (!result) {
            throw new Error('Failed to upsert Atlassian tenant');
        }

        return this.mapTenant(result as unknown as AtlassianTenant);
    }

    async deleteByClientKey(clientKey: string): Promise<boolean> {
        const collection = await AtlassianTenantCollection.get();
        const result = await collection.deleteOne({ clientKey });

        return result.deletedCount === 1;
    }

    private async mapTenant(doc: AtlassianTenant): Promise<PlainAtlassianTenant> {
        return {
            key: doc.key,
            clientKey: doc.clientKey,
            sharedSecret: doc.sharedSecret,
            baseUrl: doc.baseUrl,
            productType: doc.productType,
            cloudId: doc.cloudId,
            description: doc.description,
            eventType: doc.eventType,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };
    }
}
