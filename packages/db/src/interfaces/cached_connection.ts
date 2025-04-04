import mongoose from "mongoose";

export interface MongooseCache {
    cachedConnection: mongoose.Connection | null;
    connection: Promise<mongoose.Connection> | null;
}
