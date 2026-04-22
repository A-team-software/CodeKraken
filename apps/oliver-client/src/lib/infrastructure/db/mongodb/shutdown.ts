import _ from "lodash";
import { MongoConnectionManager } from "./client";
export const gracefulShutdown = _.once(
    async (signal?: string) => {
        console.log(
            `🛑 Shutdown signal received: ${signal}`
        );

        await MongoConnectionManager
            .getInstance()
            .disconnect();

        console.log("✅ MongoDB disconnected");

        process.exit(0);
    }
);


process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGQUIT", gracefulShutdown);
