import { UserJiraSiteAccessZodSchema, SafeExecute } from '@oliver/core';
import { UserJiraSiteAccessCollection } from '../collections/UserJiraSiteAccessCollection';
import { UserJiraSiteAccessAggregate, UserJiraSiteAccessRepository } from '@oliver/domains';

/**
 * MongoDB Repository for User-Jira-Site Access Management
 * Handles CRUD operations for user access records
 */
export class MongoUserJiraSiteAccessRepository implements UserJiraSiteAccessRepository {
    // ----------------------------------------------------------
    // SAVE (UPSERT)
    // ----------------------------------------------------------

    async save(access: UserJiraSiteAccessAggregate): Promise<UserJiraSiteAccessAggregate> {
        const collection = await UserJiraSiteAccessCollection.get();
        const cleanAccess = access.toPersistence();
        const now = new Date();

        // Build $set without null-ish expiresAt to avoid storing null in MongoDB
        const setFields: Record<string, any> = {
            scope: cleanAccess.scope,
            atlassianAccountId: cleanAccess.atlassianAccountId,
            cloudId: cleanAccess.cloudId,
            updatedAt: now,
        };
        const unsetFields: Record<string, 1> = {};

        if (cleanAccess.expiresAt != null) {
            setFields.expiresAt = cleanAccess.expiresAt;
        } else {
            unsetFields.expiresAt = 1;
        }

        const updateDoc: any = {
            $set: setFields,
            $setOnInsert: {
                userId: cleanAccess.userId,
                clientKey: cleanAccess.clientKey,
                baseUrl: cleanAccess.baseUrl,
                atlassianAccountId: cleanAccess.atlassianAccountId,
                cloudId: cleanAccess.cloudId,
                createdAt: now,
            }
        };

        if (Object.keys(unsetFields).length > 0) {
            updateDoc.$unset = unsetFields;
        }

        if (cleanAccess.id) {
            const [_, error] = await SafeExecute
                .withSync(() => collection.updateOne(
                    { _id: cleanAccess.id },
                    updateDoc,
                    { upsert: true }
                ))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();
            if (error) throw new Error(`Failed to update user site access: ${error}`);
            return access;
        } else {
            const [result, error] = await SafeExecute
                .withSync(() => collection.findOneAndUpdate(
                    {
                        userId: cleanAccess.userId,
                        clientKey: cleanAccess.clientKey,
                    },
                    updateDoc,
                    {
                        upsert: true,
                        returnDocument: 'after',
                    }
                ))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error || !result) {
                throw new Error(`Failed to save user site access: ${error}`);
            }

            return this.toAggregate(result);
        }
    }

    // ----------------------------------------------------------
    // FIND BY USER AND SITE
    // ----------------------------------------------------------

    async findByUserAndSite(userId: string, clientKey: string): Promise<UserJiraSiteAccessAggregate | null> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne({ userId, clientKey }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;
        return this.toAggregate(doc);
    }

    // ----------------------------------------------------------
    // FIND BY USER
    // ----------------------------------------------------------

    async findByUser(userId: string): Promise<UserJiraSiteAccessAggregate[]> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [docs, error] = await SafeExecute
            .withSync(() => collection.find({ userId }).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];
        return docs.map(doc => this.toAggregate(doc));
    }

    // ----------------------------------------------------------
    // FIND BY SITE
    // ----------------------------------------------------------

    async findBySite(clientKey: string): Promise<UserJiraSiteAccessAggregate[]> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [docs, error] = await SafeExecute
            .withSync(() => collection.find({ clientKey }).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];
        return docs.map(doc => this.toAggregate(doc));
    }

    // ----------------------------------------------------------
    // DELETE BY USER AND SITE
    // ----------------------------------------------------------

    async deleteByUserAndSite(userId: string, clientKey: string): Promise<boolean> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [result, error] = await SafeExecute
            .withSync(() => collection.deleteOne({ userId, clientKey }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !result) return false;
        return result.deletedCount > 0;
    }

    // ----------------------------------------------------------
    // DELETE ALL BY USER
    // ----------------------------------------------------------

    async deleteAllByUser(userId: string): Promise<number> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [result, error] = await SafeExecute
            .withSync(() => collection.deleteMany({ userId }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !result) return 0;
        return result.deletedCount || 0;
    }

    // ----------------------------------------------------------
    // DELETE ALL BY SITE
    // ----------------------------------------------------------

    async deleteAllBySite(clientKey: string): Promise<number> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [result, error] = await SafeExecute
            .withSync(() => collection.deleteMany({ clientKey }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !result) return 0;
        return result.deletedCount || 0;
    }

    // ----------------------------------------------------------
    // FIND EXPIRED
    // ----------------------------------------------------------

    async findExpired(): Promise<UserJiraSiteAccessAggregate[]> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [docs, error] = await SafeExecute
            .withSync(() => collection.find({
                expiresAt: {
                    $exists: true,
                    $lt: new Date(),
                }
            }).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];
        return docs.map(doc => this.toAggregate(doc));
    }

    // ----------------------------------------------------------
    // FIND BY ATLASSIAN ACCOUNT ID
    // ----------------------------------------------------------

    async findByAtlassianAccountId(atlassianAccountId: string): Promise<UserJiraSiteAccessAggregate | null> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne({ atlassianAccountId }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;
        return this.toAggregate(doc);
    }

    // ----------------------------------------------------------
    // FIND BY CLIENT KEY AND ATLASSIAN ACCOUNT ID
    // ----------------------------------------------------------

    async findByClientKeyAndAccountId(clientKey: string, atlassianAccountId: string): Promise<UserJiraSiteAccessAggregate | null> {
        const collection = await UserJiraSiteAccessCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne({ clientKey, atlassianAccountId }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;
        return this.toAggregate(doc);
    }

    // ----------------------------------------------------------
    // PRIVATE MAPPING
    // ----------------------------------------------------------

    private toAggregate(doc: any): UserJiraSiteAccessAggregate {
        const { _id, ...rest } = doc;

        const props = UserJiraSiteAccessZodSchema.parse({
            id: _id.toString(),
            ...rest,
        });

        return UserJiraSiteAccessAggregate.fromPersistence(props);
    }
}
