import { ForgeSessionRepository } from "../../domain/repository/ForgeSessionRepository.interface";
import { ForgeSessionCollection } from "@oliver/db";
import { ForgeSession, ForgeSessionZodSchema, SafeExecute } from "@oliver/core";
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

        const [result, error] = await SafeExecute
            .withSync(() => col.insertOne({ ...validated, createdAt: now } as ForgeSession))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (result == null) {
            throw new Error(`Failed to create Forge session`);
        }

        if (error) {
            throw new Error(`Failed to create Forge session: ${error}`);
        }

        return token;
    }

    // ----------------------------------------------------------
    // FIND BY TOKEN
    // ----------------------------------------------------------
    async findByToken(token: string): Promise<ForgeSession | null> {
        const col = await ForgeSessionCollection.get();

        const [doc, error] = await SafeExecute
            .withSync(() => col.findOne<ForgeSession>({ token }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (error || !doc) return null;

        // Double-check expiry in application layer (belt-and-suspenders)
        if (doc.expiresAt && doc.expiresAt < new Date()) {
            await SafeExecute
                .withSync(() => col.deleteOne({ token }))
                .withRetry({ attempts: 3, delayMs: 100 })
                .withTimeout(5000)
                .execute();
            return null;
        }

        return this.toDomain(doc);
    }

    // ----------------------------------------------------------
    // DELETE BY TOKEN
    // ----------------------------------------------------------
    async deleteByToken(token: string): Promise<void> {
        const col = await ForgeSessionCollection.get();

        const [result, error] = await SafeExecute
            .withSync(() => col.deleteOne({ token }))
            .withRetry({ attempts: 3, delayMs: 100 })
            .withTimeout(5000)
            .execute();

        if (result == null) {
            throw new Error(`Failed to delete Forge session`);
        }

        if (error) {
            throw new Error(`Failed to delete Forge session: ${error}`);
        }
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
