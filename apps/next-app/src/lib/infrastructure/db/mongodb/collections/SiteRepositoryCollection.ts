import { Collection } from 'mongodb';
import { MongoConnectionManager } from '../client';
import { SiteRepositoryProps } from '@/lib/domains/site_repository';

export class SiteRepositoryCollection {
    private static collection: Collection<SiteRepositoryProps>;
    private static initialized = false;

    static async get(): Promise<Collection<SiteRepositoryProps>> {
        if (!this.collection) {
            const db = await MongoConnectionManager.getDb();
            this.collection = db.collection<SiteRepositoryProps>('siterepositories');
        }

        if (!this.initialized) {
            await this.ensureIndexes();
            this.initialized = true;
        }

        return this.collection;
    }

    private static async ensureIndexes() {
        // One document per Jira site
        await this.collection.createIndex({ clientKey: 1 }, { unique: true });
    }
}
