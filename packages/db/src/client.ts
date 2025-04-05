import mongoose, { Connection, Mongoose } from "mongoose";

import dotenv from 'dotenv';
import path from 'path'; // To reliably locate the .env file

import { Logger } from "@oliver/utils"; // Assuming your Logger exists
import { DatabaseClientInterface } from "./interfaces/db_client";


const envPath = path.resolve(__dirname, '../../../.env'); // Adjust '../../.env' if needed

const loadResult = dotenv.config({ path: envPath });

if (loadResult.error) {
    // Log a warning if the .env file couldn't be loaded.
    // The getEnvVar function below will handle throwing errors for *required* variables.
    Logger.logWarn(`Warning: Error loading .env file from ${envPath}: ${loadResult.error.message}`);
    Logger.logWarn('Will rely on system environment variables.');
} else {
    Logger.logInfo(`.env file loaded successfully from ${envPath}`);
    // For debugging, uncomment carefully (don't log secrets):
    // console.log('Parsed dotenv vars:', loadResult.parsed);
}

// --- Connection Caching (Functional Approach) ---

// More descriptive cache structure
interface ConnectionCache {
    connectionPromise: Promise<Connection> | null;
    mongooseInstance: Mongoose | null; // Store the specific mongoose instance if needed
}

// Initialize cache using a global symbol for better isolation if needed,
// but standard global variable is common for this serverless/edge pattern.
const MongooseGlobalCache = Symbol.for("app.mongoose.cache");

// Type assertion for global scope
interface GlobalWithMongoose extends Global {
    [MongooseGlobalCache]?: ConnectionCache;
}

// Function to safely get or initialize the cache
function getCache(): ConnectionCache {
    const globalWithMongoose = global as any as GlobalWithMongoose;
    if (!globalWithMongoose[MongooseGlobalCache]) {
        globalWithMongoose[MongooseGlobalCache] = {
            connectionPromise: null,
            mongooseInstance: null,
        };
        Logger.logInfo("Initialized new Mongoose connection cache.");
    }
    return globalWithMongoose[MongooseGlobalCache]!;
}




const retrieveCachedConnection = async (): Promise<mongoose.Connection | null> => {
    const cached = getCache();
    if (cached.connectionPromise) {
        Logger.logInfo("Using existing Mongoose connection");
        return cached.connectionPromise;
    }
    return null;
}

const initConnection = async (): Promise<Connection | null> => {
    console.log(`[DEBUG] Connecting to MongoDB with URI: ${process.env.MONGO_DB_URI}`);
    try {
        let cached = getCache();
        if (!cached.connectionPromise) {
            cached.connectionPromise = mongoose
                .connect(process.env.MONGO_DB_URI as string, {

                    dbName: "mongoTs", // Optional: specify DB name
                    // bufferCommands: false,
                })
                .then((mongooseInstance) => mongooseInstance.connection);
        }
        return cached.connectionPromise;
    } catch (e: any) {
        Logger.logError(e);
        return null;
    }
}

export async function connect(): Promise<Connection | null> {
    const existingConnection = await retrieveCachedConnection();
    if (existingConnection) {
        return existingConnection;
    }

    const newConnection = await initConnection();
    if (newConnection == null) {
        return null;
    }
    return newConnection;
}

export async function disconnectFromDatabase(): Promise<void> {
    const cache = getCache();
    if (!cache.connectionPromise) {
        Logger.logInfo("No active connection or connection attempt to disconnect.");
        return;
    }

    try {
        // Await the connection promise first to ensure we have a connection object
        const connection = await cache.connectionPromise;
        if (connection && connection.readyState === 1) { // 1 === connected
            Logger.logInfo("Disconnecting from database...");
            await connection.close();
            Logger.logInfo("Database connection closed successfully.");
        } else {
            Logger.logWarn("Attempted to disconnect, but connection was not in a connected state.");
        }
    } catch (error) {
        // Error could be from awaiting connectionPromise if it failed initially
        Logger.logError({ msg: "Error during disconnection attempt:", error });
    } finally {
        // Clear the cache regardless of success/failure to disconnect
        cache.connectionPromise = null;
        cache.mongooseInstance = null;
        Logger.logInfo("Connection cache cleared.");
    }
}

mongoose.connection.on('connecting', () => {
    Logger.logInfo('Mongoose: Connecting...');
});

mongoose.connection.on('connected', () => {
    Logger.logInfo('Mongoose: Connection established successfully.');
});

mongoose.connection.on('error', (err) => {
    Logger.logError({ msg: 'Mongoose: Connection error:', err });
});

mongoose.connection.on('disconnected', () => {
    Logger.logWarn('Mongoose: Connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
    Logger.logInfo('Mongoose: Connection re-established.');
});

// Optional: Graceful shutdown handling
process.on('SIGINT', async () => {
    Logger.logInfo("Received SIGINT. Closing MongoDB connection...");
    await disconnectFromDatabase();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    Logger.logInfo("Received SIGTERM. Closing MongoDB connection...");
    await disconnectFromDatabase();
    process.exit(0);
});


const DatabaseClient: DatabaseClientInterface = {
    connect: connect,
    disconnectFromDatabase: disconnectFromDatabase,
} as const;
export { DatabaseClient };
