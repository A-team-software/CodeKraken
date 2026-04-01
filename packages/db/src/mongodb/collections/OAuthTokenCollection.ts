import { Collection } from "mongodb";
import { MongoConnectionManager } from "../client";
import { OAuthTokenProps } from "@oliver/core";

export class OAuthTokenCollection {
    private static collection: Collection<OAuthTokenProps>;

    static async get(): Promise<Collection<OAuthTokenProps>> {
        if (!this.collection) {
            const db = await MongoConnectionManager.getDb();
            this.collection = db.collection<OAuthTokenProps>("oauthtokens");
        }

        return this.collection;
    }
}
