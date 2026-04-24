import { ObjectId } from "@oliver/db";
import pick from "lodash/pick";


import { UserCollection } from "@oliver/db";
import { UserAggregate } from "../../domain/aggregates/user_aggregate";
import { UserRepository } from "../../domain/repository/UserRepository.interface";
import { SafeExecute, GitProvider, UserProps, UserZodSchema } from "@oliver/core";


export class MongoUserRepository
    implements UserRepository {


    nextIdentity(): string {
        return new ObjectId().toString();
    }

    // ----------------------------------------------------------
    // FIND BY ID
    // ----------------------------------------------------------

    async findById(id: string): Promise<UserAggregate | null> {
        const col = await UserCollection.get();

        const [doc, error] = await SafeExecute
            .withSync(() => col.findOne({ _id: new ObjectId(id) }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

        return this.toDomain(doc);
    }


    // ----------------------------------------------------------
    // FIND BY EMAIL
    // ----------------------------------------------------------

    async findByEmail(email: string): Promise<UserAggregate | null> {
        const col = await UserCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => col.findOne({ email }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        return (error || !doc) ? null : this.toDomain(doc);
    }


    // ----------------------------------------------------------
    // FIND BY USERNAME
    // ----------------------------------------------------------

    async findByUsername(username: string): Promise<UserAggregate | null> {
        const col = await UserCollection.get();
        const [doc, error] = await SafeExecute
            .withSync(() => col.findOne({ username }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        return (error || !doc) ? null : this.toDomain(doc);
    }


    // ----------------------------------------------------------
    // FIND BY FILTERS
    // ----------------------------------------------------------

    async findBy(filters: Partial<UserProps>): Promise<UserAggregate[]> {
        const col = await UserCollection.get();

        const cleanFilters = pick(filters, [
            "email",
            "role",
            "name",
        ]);

        const [docs, error] = await SafeExecute
            .withSync(() => col.find(cleanFilters).toArray())
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !docs) return [];

        return docs.map((d) => this.toDomain(d));
    }


    // ----------------------------------------------------------
    // FIND BY GIT ID (Replaces Mongoose static)
    // ----------------------------------------------------------

    async findByGitId(
        provider: GitProvider,
        providerId: string
    ): Promise<UserAggregate | null> {
        const col = await UserCollection.get();

        const [doc, error] = await SafeExecute
            .withSync(() => col.findOne({
                accounts: {
                    $elemMatch: {
                        provider,
                        providerAccountId: providerId,
                    },
                },
            }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        return (error || !doc) ? null : this.toDomain(doc);
    }


    // ----------------------------------------------------------
    // SAVE (UPSERT)
    // ----------------------------------------------------------

    async save(user: UserAggregate): Promise<UserAggregate> {
        const col = await UserCollection.get();
        if (!col) {
            throw new Error("Could not connect to User collection");
        }

        const cleanUser = user.toPersistence();
        const now = new Date();

        if (cleanUser.id) {
            const [_, error] = await SafeExecute
                .withSync(() => col.updateOne(
                    { _id: new ObjectId(cleanUser.id) },
                    {
                        $set: {
                            name: cleanUser.name,
                            email: cleanUser.email,
                            image: cleanUser.image,
                            role: cleanUser.role,
                            accounts: cleanUser.accounts,
                            username: cleanUser.username,
                            avatarUrl: cleanUser.avatarUrl,
                            url: cleanUser.url,
                            settings: cleanUser.settings,
                            updatedAt: now,
                        },
                        $setOnInsert: {
                            createdAt: now,
                        },
                    },
                    { upsert: true }
                ))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error) throw new Error(`Failed to update user: ${error}`);
            return user;
        } else {
            const [result, error] = await SafeExecute
                .withSync(() => col.insertOne({
                    ...cleanUser,
                    createdAt: now,
                    updatedAt: now,
                }))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();

            if (error || !result) throw new Error(`Failed to save new user: ${error}`);

            // Reconstitute with the new ID
            return UserAggregate.fromPersistence({
                ...cleanUser,
                id: result.insertedId.toString(),
                createdAt: now,
                updatedAt: now,
            });
        }
    }


    // ----------------------------------------------------------
    // PRIVATE: Mongo → Domain
    // ----------------------------------------------------------

    private toDomain(doc: any): UserAggregate {
        const { _id, ...rest } = doc;

        const props = UserZodSchema.parse({
            ...rest,
            id: _id.toString(),
        });

        return UserAggregate.fromPersistence(props);
    }
}
