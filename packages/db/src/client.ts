import mongoose from "mongoose";
import MongooseCache from "./interfaces/cached_connection";
import { Logger } from "@oliver/utils";




// Use a global variable to store the connection
let cached: MongooseCache = (global as any)._mongooseCache || { cachedConnection: null, connection: null };

const retrieveCachedConnection = async (): Promise<mongoose.Connection | null> => {
    if (cached.cachedConnection) {
        Logger.logInfo("Using existing Mongoose connection");
        return cached.cachedConnection;
    }
    return null;
}

const initConnection = async (): Promise<boolean> => {
    try {
        const dbURL = "mongodb://localhost:27017/";
        const localURL = "mongodb://mongodb:27017/";
        if (!cached.connection) {
            cached.connection = mongoose
                .connect(dbURL, {

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
// await mongoose
//                     .connect("mongodb+srv://ben:fkBa8koAe5UWS9jL@cluster0.ojnan.mongodb.net/mongoTs?retryWrites=true&w=majority", {
//                         // dbName: DB_NAME, // Optional: specify DB name
//                         // bufferCommands: false,
//                     });
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
