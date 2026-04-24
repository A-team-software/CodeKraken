import { ObjectId } from "mongodb";
import pick from "lodash/pick";


import { UserRepository } from "@/lib/user/domain/repository/UserRepository.interface";
import { UserCollection } from "@/lib/infrastructure/db/mongodb/collections/UserCollection";
import { UserAggregate, UserProps, UserZodSchema } from "@/lib/user";
import { GitProvider } from "@/lib/git";


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

        const doc = await col.findOne({
            _id: new ObjectId(id),
        });

        if (!doc) return null;

        return this.toDomain(doc);
    }


    // ----------------------------------------------------------
    // FIND BY EMAIL
    // ----------------------------------------------------------

    async findByEmail(email: string): Promise<UserAggregate | null> {
        const col = await UserCollection.get();
        const doc = await col.findOne({ email });
        return doc ? this.toDomain(doc) : null;
    }


    // ----------------------------------------------------------
    // FIND BY USERNAME
    // ----------------------------------------------------------

    async findByUsername(username: string): Promise<UserAggregate | null> {
        const col = await UserCollection.get();
        const doc = await col.findOne({ username });
        return doc ? this.toDomain(doc) : null;
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

        const docs = await col
            .find(cleanFilters)
            .toArray();

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

        const doc = await col.findOne({
            accounts: {
                $elemMatch: {
                    provider,
                    providerAccountId: providerId,
                },
            },
        });

        return doc ? this.toDomain(doc) : null;
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
            await col.updateOne(
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
            );
            return user;
        } else {
            const result = await col.insertOne({
                ...cleanUser,
                createdAt: now,
                updatedAt: now,
            });

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
