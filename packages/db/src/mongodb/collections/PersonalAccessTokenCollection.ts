import { Collection } from "mongodb";
import { MongoConnectionManager } from "../client";
import { PersonalAccessTokenProps } from "@oliver/core";

export class PersonalAccessTokenCollection {
    private static collection: Collection<PersonalAccessTokenProps>;

    static async get(): Promise<Collection<PersonalAccessTokenProps>> {
        if (!this.collection) {
            const db = await MongoConnectionManager.getDb();
            this.collection = db.collection<PersonalAccessTokenProps>("personal_access_tokens");
        }
        return this.collection;
    }
}
