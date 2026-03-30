import { ISiteRepositoryRepository, SiteRepositoryAggregate, SiteRepositorySchema } from '@/lib/domains/site_repository';
import { SiteRepositoryCollection } from '../collections/SiteRepositoryCollection';

/**
 * MongoDB adapter for the ISiteRepositoryRepository port.
 *
 * Stores one document per Jira site (`clientKey`), containing the full
 * array of assigned repositories as an embedded array.
 */
export class MongoSiteRepositoryRepository implements ISiteRepositoryRepository {

    async findBySite(clientKey: string): Promise<SiteRepositoryAggregate | null> {
        const collection = await SiteRepositoryCollection.get();
        const doc = await collection.findOne({ clientKey });

        if (!doc) return null;

        // Validate and reconstruct aggregate from persisted data
        const props = SiteRepositorySchema.parse({
            clientKey: doc.clientKey,
            siteUrl: doc.siteUrl,
            repos: doc.repos ?? [],
        });

        return SiteRepositoryAggregate.fromPersistence(props);
    }

    async findBySiteUrl(siteUrl: string): Promise<SiteRepositoryAggregate | null> {
        const collection = await SiteRepositoryCollection.get();
        
        // Basic normalization: strip trailing slashes, enforce matching domain and path
        const normalizedUrl = siteUrl.replace(/\/$/, '');
        
        // Perform search using regex for trailing slash leniency and case insensitivity
        const doc = await collection.findOne({ 
            siteUrl: { 
                $regex: new RegExp(`^${normalizedUrl}\\/?$`, 'i') 
            } 
        });

        if (!doc) return null;

        const props = SiteRepositorySchema.parse({
            clientKey: doc.clientKey,
            siteUrl: doc.siteUrl,
            repos: doc.repos ?? [],
        });

        return SiteRepositoryAggregate.fromPersistence(props);
    }

    async save(siteRepository: SiteRepositoryAggregate): Promise<void> {
        const collection = await SiteRepositoryCollection.get();
        const data = siteRepository.toPersistence();
        const now = new Date();

        await collection.findOneAndUpdate(
            { clientKey: data.clientKey },
            {
                $set: {
                    siteUrl: data.siteUrl,
                    repos: data.repos,
                    updatedAt: now,
                },
                $setOnInsert: {
                    createdAt: now,
                },
            },
            {
                upsert: true,
                returnDocument: 'after',
            }
        );
    }
}
