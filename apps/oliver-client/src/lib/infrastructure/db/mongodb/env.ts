import { z } from "zod";

export const MongoEnvSchema = z.object({
    MONGO_URI: z.url(),
    MONGO_DB_NAME: z.string(),

    MAX_POOL_SIZE: z.coerce.number().default(200),
    MIN_POOL_SIZE: z.coerce.number().default(20),

    SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().default(3000),
    SOCKET_TIMEOUT_MS: z.coerce.number().default(20000),

    RETRIES: z.coerce.number().default(5),
    RETRY_DELAY_MS: z.coerce.number().default(300),
});

export type MongoEnv = z.infer<typeof MongoEnvSchema>;

const parsed = MongoEnvSchema.safeParse(process.env);

if (!parsed.success) {
    const isBuild = process.env.NEXT_PHASE === 'phase-production-build' || process.env.NODE_ENV === 'test';

    if (isBuild) {
        console.warn("⚠️ MongoDB environment variables missing during build/test. Using dummy values.");
    } else {
        console.error("❌ MongoDB validation failed:", parsed.error.format());
        throw new Error("Invalid MongoDB configuration");
    }
}

export const ENV = parsed.success ? parsed.data : MongoEnvSchema.parse({
    MONGO_URI: process.env.MONGO_DB_URI || "mongodb://localhost:27017",
    MONGO_DB_NAME: process.env.MONGO_DB_NAME || "default",
});
