import { ISiteRepositoryRepository, SiteRepositoryAggregate, SiteRepositoryProps, SiteRepositorySchema } from '@oliver/domains';
import { SiteRepositoryCollection } from '../collections/SiteRepositoryCollection';
import { SafeExecute } from '@oliver/core';

/**
 * MongoDB adapter for the ISiteRepositoryRepository port.
 *
 * Stores one document per Jira site (`clientKey`), containing the full
 * array of assigned repositories as an embedded array.
 */

export class MongoSiteRepositoryRepository implements ISiteRepositoryRepository {

    async findBySite(clientKey: string): Promise<SiteRepositoryAggregate | null> {
        const collection = await SiteRepositoryCollection.get();
        const res = await collection.findOne({ clientKey });
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne<SiteRepositoryProps>({ clientKey }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

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
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne({
                siteUrl: {
                    $regex: new RegExp(`^${normalizedUrl}\\/?$`, 'i')
                }
            }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

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

        await SafeExecute
            .withSync(() => collection.findOneAndUpdate(
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
            ))
            .withRetry({ attempts: 3, delayMs: 200 })
            .withTimeout(5000)
            .withMapError((err) => new Error(`DB Save Failed: ${err}`))
            .execute();
    }
}
