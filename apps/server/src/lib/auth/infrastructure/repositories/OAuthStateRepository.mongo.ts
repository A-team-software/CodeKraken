import { OAuthStateRepository } from "../../domain/repository/OAuthStateRepository.interface";

import { OAuthStateCollection } from "@/lib/infrastructure/db/mongodb/collections/OAuthStateCollection";
import { OAuthState, OAuthStateZodSchema } from "../../domain/entities/oauth_state_entity";

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

        await col.insertOne({
            ...validatedState,
            createdAt: now,
        } as OAuthState);
    }

    // ----------------------------------------------------------
    // FIND BY STATE
    // ----------------------------------------------------------

    async findByState(state: string): Promise<OAuthState | null> {
        const col = await OAuthStateCollection.get();

        const doc = await col.findOne({ state });

        if (!doc) {

            return null;
        }

        return this.toDomain(doc);
    }

    // ----------------------------------------------------------
    // DELETE BY STATE
    // ----------------------------------------------------------

    async deleteByState(state: string): Promise<void> {
        const col = await OAuthStateCollection.get();

        await col.deleteOne({ state });

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
