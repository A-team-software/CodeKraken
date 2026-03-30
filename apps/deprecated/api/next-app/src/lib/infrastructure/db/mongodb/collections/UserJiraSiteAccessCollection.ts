import { Collection } from 'mongodb';
import { MongoConnectionManager } from '../client';
import { UserJiraSiteAccessDocument } from '../models/UserJiraSiteAccess.model';

export class UserJiraSiteAccessCollection {
    private static collection: Collection<UserJiraSiteAccessDocument>;
    private static initialized = false;

    static async get(): Promise<Collection<UserJiraSiteAccessDocument>> {
        if (!this.collection) {
            const db = await MongoConnectionManager.getDb();
            this.collection = db.collection<UserJiraSiteAccessDocument>('usersitaccess');
        }

        if (!this.initialized) {
            await this.ensureIndexes();
            this.initialized = true;
        }

        return this.collection;
    }

    private static async ensureIndexes() {
        await Promise.all([
            // Compound index: userId + clientKey (unique)
            this.collection.createIndex(
                { userId: 1, clientKey: 1 },
                { unique: true }
            ),
            // Index by userId for finding all sites a user has access to
            this.collection.createIndex(
                { userId: 1 }
            ),
            // Index by clientKey for finding all users with access to a site
            this.collection.createIndex(
                { clientKey: 1 }
            ),
            // TTL index on expiresAt for automatic cleanup
            this.collection.createIndex(
                { expiresAt: 1 },
                {
                    expireAfterSeconds: 0,
                    partialFilterExpression: { expiresAt: { $exists: true } }
                }
            ),
            // Index on createdAt for cleanup queries
            this.collection.createIndex(
                { createdAt: 1 }
            ),
            // Index on atlassianAccountId for status lookups from Forge
            this.collection.createIndex(
                { atlassianAccountId: 1 }
            )
        ]);
    }
}
