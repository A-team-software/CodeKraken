import { MongoClient, Db } from "mongodb";
import _ from "lodash";
import { ENV } from "./env";
import { DBCircuitBreaker } from "./circuit_breaker";

/**
 * Global cache for MongoDB connection.
 * In serverless environments like Vercel, this persists across function re-uses
 * if the instance is still warm.
 */
declare global {
    var _mongoClient: MongoClient | null;
    var _mongoDb: Db | null;
}

if (!global._mongoClient) {
    global._mongoClient = null;
}
if (!global._mongoDb) {
    global._mongoDb = null;
}

export class MongoConnectionManager {
    private static instance: MongoConnectionManager;

    private client: MongoClient | null = global._mongoClient;
    private db: Db | null = global._mongoDb;
    private connecting: Promise<Db> | null = null;

    private breaker = new DBCircuitBreaker();

    private constructor() { }

    static getInstance(): MongoConnectionManager {
        if (!this.instance) {
            this.instance = new MongoConnectionManager();
        }
        return this.instance;
    }

    private createClient(): MongoClient {
        return new MongoClient(ENV.MONGO_URI, {
            maxPoolSize: ENV.MAX_POOL_SIZE,
            minPoolSize: ENV.MIN_POOL_SIZE,

            serverSelectionTimeoutMS:
                ENV.SERVER_SELECTION_TIMEOUT_MS,

            socketTimeoutMS: ENV.SOCKET_TIMEOUT_MS,

            retryReads: true,
            retryWrites: true,

            compressors: ["zstd", "snappy"],
        });
    }

    async connect(): Promise<Db> {
        if (this.db) return this.db;

        if (this.connecting) return this.connecting;

        if (!this.breaker.canExecute()) {
            throw new Error(
                "Circuit breaker open — Mongo unavailable"
            );
        }

        this.connecting = this.retry(async () => {
            const client = this.createClient();
            await client.connect();

            const db = client.db(ENV.MONGO_DB_NAME);

            this.client = client;
            this.db = db;

            // Store in global cache for serverless reuse
            global._mongoClient = client;
            global._mongoDb = db;

            this.breaker.recordSuccess();

            return db;
        }).finally(() => {
            this.connecting = null;
        });

        return this.connecting;
    }

    static async getDb(): Promise<Db> {
        return await this.getInstance().connect();
    }

    async disconnect(): Promise<void> {
        if (!this.client) return;

        await this.client.close();

        this.client = null;
        this.db = null;
        this.connecting = null;
    }

    async ping(): Promise<boolean> {
        try {
            const db = await this.connect();
            await db.command({ ping: 1 });
            return true;
        } catch (e) {
            this.breaker.recordFailure();
            return false;
        }
    }

    private async retry<T>(
        fn: () => Promise<T>
    ): Promise<T> {
        let error: unknown;

        for (let i = 0; i < ENV.RETRIES; i++) {
            try {
                return await fn();
            } catch (e) {
                error = e;
                this.breaker.recordFailure();


            }
        }

        throw error;
    }
}


const shutdown = _.once(async () => {
    await MongoConnectionManager
        .getInstance()
        .disconnect();

    process.exit(0);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
