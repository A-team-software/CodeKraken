import { ForgeSessionRepository } from "../../domain/repository/ForgeSessionRepository.interface";
import { ForgeSessionCollection } from "@/lib/infrastructure/db/mongodb/collections/ForgeSessionCollection";
import { ForgeSession, ForgeSessionZodSchema } from "../../domain/entities/forge_session_entity";
import { randomUUID } from "crypto";

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class MongoForgeSessionRepository implements ForgeSessionRepository {
    // ----------------------------------------------------------
    // CREATE
    // ----------------------------------------------------------
    async create(accountId: string, cloudId: string, provider: string): Promise<string> {
        const col = await ForgeSessionCollection.get();

        const now = new Date();
        const token = randomUUID();
        const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

        const session: Omit<ForgeSession, "id"> = {
            token,
            accountId,
            cloudId,
            provider,
            createdAt: now,
            expiresAt,
        };

        const validated = ForgeSessionZodSchema.parse(session);
        await col.insertOne({ ...validated, createdAt: now } as ForgeSession);

        return token;
    }

    // ----------------------------------------------------------
    // FIND BY TOKEN
    // ----------------------------------------------------------
    async findByToken(token: string): Promise<ForgeSession | null> {
        const col = await ForgeSessionCollection.get();

        const doc = await col.findOne({ token });
        if (!doc) return null;

        // Double-check expiry in application layer (belt-and-suspenders)
        if (doc.expiresAt && doc.expiresAt < new Date()) {
            await col.deleteOne({ token });
            return null;
        }

        return this.toDomain(doc);
    }

    // ----------------------------------------------------------
    // DELETE BY TOKEN
    // ----------------------------------------------------------
    async deleteByToken(token: string): Promise<void> {
        const col = await ForgeSessionCollection.get();
        await col.deleteOne({ token });
    }

    // ----------------------------------------------------------
    // PRIVATE: Mongo → Domain
    // ----------------------------------------------------------
    private toDomain(doc: any): ForgeSession {
        const { _id, ...rest } = doc;
        return ForgeSessionZodSchema.parse({
            id: _id.toString(),
            ...rest,
        });
    }
}
