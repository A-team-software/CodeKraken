import { OAuthStateRepository } from "../../domain/repository/OAuthStateRepository.interface";

import { OAuthStateCollection } from "@oliver/db";
import { OAuthState, OAuthStateZodSchema, SafeExecute } from "@oliver/core";

const STATE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

export class MongoOAuthStateRepository implements OAuthStateRepository {
    // ----------------------------------------------------------
    // CREATE
    // ----------------------------------------------------------
    async create(state: string, provider: string, metadata?: string): Promise<void> {
        const col = await OAuthStateCollection.get();

        const now = new Date();
        const expiresAt = new Date(now.getTime() + STATE_TTL);

        const oauthState: Partial<OAuthState> = {
            state,
            provider,
            metadata,
            expiresAt,
        };

        // Validate with Zod before inserting
        const validatedState = OAuthStateZodSchema.parse(oauthState);

        const [_, error] = await SafeExecute
            .withSync(() => col.insertOne({
                ...validatedState,
                createdAt: now,
            } as OAuthState))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error) {
            throw new Error(`Failed to create OAuth state: ${error}`);
        }
    }

    // ----------------------------------------------------------
    // FIND BY STATE
    // ----------------------------------------------------------

    async findByState(state: string): Promise<OAuthState | null> {
        const col = await OAuthStateCollection.get();

        const [doc, error] = await SafeExecute
            .withSync(() => col.findOne({ state }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) {
            return null;
        }

        return this.toDomain(doc);
    }

    // ----------------------------------------------------------
    // DELETE BY STATE
    // ----------------------------------------------------------

    async deleteByState(state: string): Promise<void> {
        const col = await OAuthStateCollection.get();

        await SafeExecute
            .withSync(() => col.deleteOne({ state }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();
    }

    // ----------------------------------------------------------
    // PRIVATE: Mongo → Domain
    // ----------------------------------------------------------

    private toDomain(doc: any): OAuthState {
        const { _id, ...rest } = doc;

        return OAuthStateZodSchema.parse({
            id: _id.toString(),
            ...rest,
        });

    }

}
