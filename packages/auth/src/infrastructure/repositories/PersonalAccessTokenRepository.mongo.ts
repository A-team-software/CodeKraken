import { ObjectId } from '@oliver/db';
import { PersonalAccessTokenAggregate, PersonalAccessTokenProps, PersonalAccessTokenZodSchema, SafeExecute } from '@oliver/core';
import { PersonalAccessTokenCollection } from '@oliver/db';
import { PersonalAccessTokenRepository } from '../../domain/repository/PersonalAccessTokenRepository.interface';

export class MongoPersonalAccessTokenRepository implements PersonalAccessTokenRepository {
    async save(token: PersonalAccessTokenAggregate): Promise<PersonalAccessTokenAggregate> {
        const collection = await PersonalAccessTokenCollection.get();
        const cleanToken = token.toPersistence();
        const now = new Date();

        if (cleanToken.id) {
            const [_, error] = await SafeExecute
                .withSync(() => collection.updateOne(
                    { _id: new ObjectId(cleanToken.id) },
                    {
                        $set: {
                            name: cleanToken.name,
                            token: cleanToken.token,
                            lastUsedAt: cleanToken.lastUsedAt,
                            updatedAt: now,
                        }
                    }
                ))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error) throw new Error(`Database save failed: ${error}`);
            return token;
        } else {
            const [result, error] = await SafeExecute
                .withSync(() => collection.insertOne({
                    ...cleanToken,
                    createdAt: now,
                    updatedAt: now,
                } as any))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error || !result) {
                console.error('MongoDB save error in PersonalAccessTokenRepository:', error);
                throw new Error(`Database save failed: ${error}`);
            }

            const [inserted, retrieveError] = await SafeExecute
                .withSync(() => collection.findOne({ _id: result.insertedId }))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (retrieveError || !inserted) throw new Error('Failed to save Personal Access Token: Insertion succeeded but retrieval failed');

            return this.toAggregate(inserted);
        }
    }

    async findById(id: string): Promise<PersonalAccessTokenAggregate | null> {
        const collection = await PersonalAccessTokenCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne<PersonalAccessTokenProps>({ _id: new ObjectId(id) }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();
        if (error || !doc) return null;
        return this.toAggregate(doc);
    }

    async findByToken(token: string): Promise<PersonalAccessTokenAggregate | null> {
        const collection = await PersonalAccessTokenCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => collection.findOne<PersonalAccessTokenProps>({ token }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();
        if (error || !doc) return null;
        return this.toAggregate(doc);
    }

    async findByUser(userId: string): Promise<PersonalAccessTokenAggregate[]> {
        const collection = await PersonalAccessTokenCollection.get();
        const [docs, error] = await SafeExecute
            .withSync(() => collection.find<PersonalAccessTokenProps>({ userId }).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];
        return docs.map(doc => this.toAggregate(doc));
    }

    async delete(id: string): Promise<void> {
        const collection = await PersonalAccessTokenCollection.get();
        await SafeExecute
            .withSync(() => collection.deleteOne({ _id: new ObjectId(id) }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();
    }

    private toAggregate(doc: any): PersonalAccessTokenAggregate {
        const { _id, ...rest } = doc;
        const props = PersonalAccessTokenZodSchema.parse({
            ...rest,
            id: _id.toString(),
        });
        return PersonalAccessTokenAggregate.fromPersistence(props);
    }
}
