import mongoose from "mongoose";
import { MongooseCache } from "./interfaces/cached_connection";
import { Logger } from "@oliver/utils";




// Use a global variable to store the connection
let cached: MongooseCache = (global as any)._mongooseCache || { cachedConnection: null, connection: null };


mongoose.connection.on('connecting', () => {
    Logger.logInfo('Mongoose: Connecting...');
});

mongoose.connection.on('connected', () => {
    Logger.logInfo('Mongoose: Connection established successfully.');
});

mongoose.connection.on('error', (err) => {
    Logger.logError('Mongoose: Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    Logger.logWarn('Mongoose: Connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
    Logger.logInfo('Mongoose: Connection re-established.');
});


const retrieveCachedConnection = async (): Promise<mongoose.Connection | null> => {
    if (cached.cachedConnection) {
        Logger.logInfo("Using existing Mongoose connection");
        return cached.cachedConnection;
    }
    return null;
}

const initConnection = async (): Promise<boolean> => {
    console.log(`[DEBUG] Connecting to MongoDB with URI: ${process.env.MONGODB_URI}`);
    try {
        const dbURL = "mongodb://localhost:27017/";
        const uri = 'mongodb://localhost:27017/'
        const localURL = "mongodb://mongodb:27017/";
        if (!cached.connection) {
            cached.connection = mongoose
                .connect(process.env.MONGODB_URI as string, {

                    dbName: "mongoTs", // Optional: specify DB name
                    // bufferCommands: false,
                })
                .then((mongooseInstance) => mongooseInstance.connection);
        }
        return true;
    } catch (e: any) {
        Logger.logError(e);
        return false;
    }
}

export async function DbConnect(): Promise<mongoose.Connection | null> {
    const existingConnection = await retrieveCachedConnection();
    if (existingConnection) {
        return existingConnection;
    }

    const newConnection = await initConnection();
    if (newConnection == false) {
        return null;
    }
    try {
        cached.cachedConnection = await cached.connection;
        return cached.cachedConnection;
    } catch (e: any) {
        return null;
    }
}

export const disconnectFromDatabase = async (): Promise<boolean> => {
    try {
        console.log("Disconnecting from database...");
        await mongoose.disconnect();
        console.log("Database disconnected.");
        return true;
    } catch (e: any) {
        Logger.logError(e);
        return false;
    }
};
// Ensure global cache is set (for hot-reloading)
(global as any)._mongooseCache = cached;
