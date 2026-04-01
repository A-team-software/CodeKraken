import { Collection } from "mongodb";
import { MongoConnectionManager } from "../client";
import { UserProps } from "@oliver/user";

export class UserCollection {
    private static collection: Collection<UserProps>;
    private static initialized = false;

    static async get(): Promise<Collection<UserProps>> {
        if (!this.collection) {
            this.collection = await (await MongoConnectionManager.getInstance().connect()).collection<UserProps>("users");
        }

        if (!this.initialized) {
            await this.ensureIndexes();
            this.initialized = true;
        }

        return this.collection;
    }

    private static async ensureIndexes() {
        await this.collection.createIndexes([
            // Unique email
            {
                key: { email: 1 },
                unique: true,
            },

            // Sparse unique index for provider username
            {
                key: { username: 1 },
                unique: true,
                sparse: true,
            },

            // Compound index for Git account uniqueness
            {
                key: {
                    "accounts.provider": 1,
                    "accounts.providerAccountId": 1,
                },
                unique: true,
                sparse: true,
            },

            // Useful query indexes
            { key: { createdAt: -1 } },
        ]);
    }
}
