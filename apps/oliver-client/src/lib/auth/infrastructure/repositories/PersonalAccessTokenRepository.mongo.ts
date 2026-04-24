import { ObjectId } from 'mongodb';
import { PersonalAccessTokenAggregate, PersonalAccessTokenProps, PersonalAccessTokenZodSchema } from '../../domain/entities/personal_access_token_entity';
import { PersonalAccessTokenCollection } from '@/lib/infrastructure/db/mongodb/collections/PersonalAccessTokenCollection';
import { PersonalAccessTokenRepository } from '../../domain/repository/PersonalAccessTokenRepository.interface';

export class MongoPersonalAccessTokenRepository implements PersonalAccessTokenRepository {
    async save(token: PersonalAccessTokenAggregate): Promise<PersonalAccessTokenAggregate> {
        const collection = await PersonalAccessTokenCollection.get();
        const cleanToken = token.toPersistence();
        const now = new Date();

        if (cleanToken.id) {
            await collection.updateOne(
                { _id: new ObjectId(cleanToken.id) },
                {
                    $set: {
                        name: cleanToken.name,
                        token: cleanToken.token,
                        lastUsedAt: cleanToken.lastUsedAt,
                        updatedAt: now,
                    }
                }
            );
            return token;
        } else {
            try {
                const result = await collection.insertOne({
                    ...cleanToken,
                    createdAt: now,
                    updatedAt: now,
                } as any);

                const inserted = await collection.findOne({ _id: result.insertedId });
                if (!inserted) throw new Error('Failed to save Personal Access Token: Insertion succeeded but retrieval failed');

                return this.toAggregate(inserted);
            } catch (mongoError: any) {
                console.error('MongoDB save error in PersonalAccessTokenRepository:', mongoError);
                throw new Error(`Database save failed: ${mongoError.message}`);
            }
        }
    }

    async findById(id: string): Promise<PersonalAccessTokenAggregate | null> {
        const collection = await PersonalAccessTokenCollection.get();
        const doc = await collection.findOne({ _id: new ObjectId(id) });
        if (!doc) return null;
        return this.toAggregate(doc);
    }

    async findByToken(token: string): Promise<PersonalAccessTokenAggregate | null> {
        const collection = await PersonalAccessTokenCollection.get();
        const doc = await collection.findOne({ token });
        if (!doc) return null;
        return this.toAggregate(doc);
    }

    async findByUser(userId: string): Promise<PersonalAccessTokenAggregate[]> {
        const collection = await PersonalAccessTokenCollection.get();
        const docs = await collection.find({ userId }).toArray();
        return docs.map(doc => this.toAggregate(doc));
    }

    async delete(id: string): Promise<void> {
        const collection = await PersonalAccessTokenCollection.get();
        await collection.deleteOne({ _id: new ObjectId(id) });
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
