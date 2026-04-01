import { ObjectId } from '@oliver/db';
import { ProviderType, OAuthTokenZodSchema, SafeExecute } from '@oliver/core';
import { OAuthTokenCollection } from '@oliver/db';
import { OAuthTokenRepository } from '../../domain/repository/OAuthTokenRepository.interface';
import { OAuthTokenAggregate } from '@/src/domain';

/**
 * MongoDB Repository for OAuth Token Management
 * Handles CRUD operations for encrypted OAuth tokens
 */
export class MongoOAuthTokenRepository implements OAuthTokenRepository {
    // ----------------------------------------------------------
    // SAVE (UPSERT)
    // ----------------------------------------------------------

    async save(token: OAuthTokenAggregate): Promise<OAuthTokenAggregate> {
        const collection = await OAuthTokenCollection.get();
        const cleanToken = token.toPersistence();

        const accessToken = cleanToken.accessToken;
        const refreshToken = cleanToken.refreshToken;

        const now = new Date();

        if (cleanToken.id) {
            const [_, error] = await SafeExecute
                .withSync(() => collection.updateOne(
                    { _id: new ObjectId(cleanToken.id) },
                    {
                        $set: {
                            accessToken,
                            refreshToken,
                            expiresAt: cleanToken.expiresAt,
                            tokenType: cleanToken.tokenType,
                            scope: cleanToken.scope,
                            clientKey: cleanToken.clientKey,
                            cloudId: cleanToken.cloudId,
                            atlassianAccountId: cleanToken.atlassianAccountId,
                            updatedAt: now,
                        },
                        $setOnInsert: {
                            createdAt: now,
                        }
                    },
                    { upsert: true }
                ))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error) {
                throw new Error(`Failed to update OAuth token: ${error}`);
            }
            return token;
        } else {
            const [result, error] = await SafeExecute
                .withSync(() => collection.findOneAndUpdate(
                    {
                        userId: cleanToken.userId,
                        provider: cleanToken.provider.toLowerCase(),
                        providerType: cleanToken.providerType,
                    },
                    {
                        $set: {
                            accessToken,
                            refreshToken,
                            expiresAt: cleanToken.expiresAt,
                            tokenType: cleanToken.tokenType,
                            scope: cleanToken.scope,
                            clientKey: cleanToken.clientKey,
                            cloudId: cleanToken.cloudId,
                            atlassianAccountId: cleanToken.atlassianAccountId,
                            updatedAt: now,
                        },
                        $setOnInsert: {
                            createdAt: now,
                        }
                    },
                    {
                        upsert: true,
                        returnDocument: 'after',
                    }
                ))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error || !result) {
                throw new Error(`Failed to save OAuth token: ${error}`);
            }

            return await this.toAggregate(result);
        }
    }

    // ----------------------------------------------------------
    // FIND BY USER AND PROVIDER
    // ----------------------------------------------------------

    async findByUserAndProvider(
        userId: string,
        provider: string,
        providerType: ProviderType
    ): Promise<OAuthTokenAggregate | null> {
        const collection = await OAuthTokenCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne({
                userId,
                provider: provider.toLowerCase(),
                providerType
            }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

        return await this.toAggregate(doc);
    }

    // ----------------------------------------------------------
    // FIND BY CLIENT KEY AND PROVIDER (site-level token)
    // ----------------------------------------------------------

    async findByClientKeyAndProvider(
        clientKey: string,
        provider: string,
        providerType: ProviderType
    ): Promise<OAuthTokenAggregate | null> {
        const collection = await OAuthTokenCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne({
                clientKey,
                provider: provider.toLowerCase(),
                providerType,
            }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

        return await this.toAggregate(doc);
    }

    // ----------------------------------------------------------
    // FIND BY ATLASSIAN ACCOUNT ID AND CLOUD ID (Forge-native lookup)
    // ----------------------------------------------------------

    async findByAtlassianAccountIdAndCloudId(
        atlassianAccountId: string,
        cloudId: string,
        providerType?: string,
        provider?: string
    ): Promise<OAuthTokenAggregate | null> {
        const collection = await OAuthTokenCollection.get();
        const query: Record<string, any> = { atlassianAccountId, cloudId };
        if (providerType) query.providerType = providerType;
        if (provider) query.provider = provider.toLowerCase();

        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne(query))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

        return await this.toAggregate(doc);
    }

    // ----------------------------------------------------------
    // DELETE BY USER AND PROVIDER
    // ----------------------------------------------------------

    async deleteByUserAndProvider(
        userId: string,
        provider: string,
        providerType: ProviderType
    ): Promise<boolean> {
        const collection = await OAuthTokenCollection.get();
        const [result, error] = await SafeExecute
            .withSync(() => collection.deleteOne({
                userId,
                provider: provider.toLowerCase(),
                providerType,
            }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !result) return false;

        return result.deletedCount > 0;
    }

    // ----------------------------------------------------------
    // FIND BY USER
    // ----------------------------------------------------------

    async findByUser(userId: string): Promise<OAuthTokenAggregate[]> {
        const collection = await OAuthTokenCollection.get();
        const [docs, error] = await SafeExecute
            .withSync(() => collection.find({ userId }).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];

        return Promise.all(docs.map(doc => this.toAggregate(doc)));
    }

    // ----------------------------------------------------------
    // FIND EXPIRING SOON
    // ----------------------------------------------------------

    async findExpiringSoon(minutes: number = 5): Promise<OAuthTokenAggregate[]> {
        const collection = await OAuthTokenCollection.get();
        const expiryThreshold = new Date(Date.now() + minutes * 60 * 1000);

        const [docs, error] = await SafeExecute
            .withSync(() => collection.find({
                expiresAt: {
                    $exists: true,
                    $lte: expiryThreshold,
                    $gt: new Date(), // Not already expired
                },
                refreshToken: { $exists: true }, // Only tokens that can be refreshed
            }).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];

        return Promise.all(docs.map(doc => this.toAggregate(doc)));
    }

    // ----------------------------------------------------------
    // DELETE ALL BY USER
    // ----------------------------------------------------------

    async deleteAllByUser(userId: string): Promise<number> {
        const collection = await OAuthTokenCollection.get();
        const [result, error] = await SafeExecute
            .withSync(() => collection.deleteMany({ userId }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !result) return 0;
        return result.deletedCount || 0;
    }

    // ----------------------------------------------------------
    // PRIVATE MAPPING
    // ----------------------------------------------------------

    private async toAggregate(doc: any): Promise<OAuthTokenAggregate> {
        const { _id, accessToken, refreshToken, ...rest } = doc;

        const props = OAuthTokenZodSchema.parse({
            id: _id.toString(),
            accessToken,
            refreshToken,
            clientKey: doc.clientKey,
            cloudId: doc.cloudId,
            atlassianAccountId: doc.atlassianAccountId,
            ...rest,
        });

        return OAuthTokenAggregate.fromPersistence(props);
    }
}
