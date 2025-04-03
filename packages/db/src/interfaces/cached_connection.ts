import mongoose from "mongoose";

export default interface MongooseCache {
    cachedConnection: mongoose.Connection | null;
    connection: Promise<mongoose.Connection> | null;
}
