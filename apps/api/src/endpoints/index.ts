import { serve } from "bun";

import { DatabaseClient } from "@oliver/db";
import { join, relative } from "path"; // Added 'relative'
import { Glob } from "bun"; // Import Bun's Glob class
import { SessionData } from '../features/auth/session';
import { Logger } from '@oliver/utils';
// --- Configuration ---
// Load from environment variables in production!
const COOKIE_SECRET = process.env.COOKIE_SECRET;

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24; // 1 day

console.log("Starting Bun server with built-in cookie handling...");

console.log(process.env.GITHUB_CLIENT_ID);

// Define the type for your route handlers more explicitly
type RouteHandler = (req: Request) => Response | Promise<Response>;
const apiRoutes: Record<string, RouteHandler> = {};

const baseRoutesDir = join(__dirname, "v1"); // The root directory for v1 routes
Logger.logInfo(`Scanning for routes in: ${baseRoutesDir}`);

// Use Bun.Glob to find all .ts files recursively within baseRoutesDir
const glob = new Glob("**/*.ts"); // Matches all .ts files in all subdirectories

// Scan the directory asynchronously (or use scanSync if preferred at startup)
for await (const relativePath of glob.scan(baseRoutesDir)) {
    // relativePath will be like 'users/user.ts' or 'tasks/task.ts' or 'topLevelRoute.ts'
    const absolutePath = join(baseRoutesDir, relativePath);

    try {
        // Dynamically import the module
        const routeModule = await import(absolutePath);

        // Check if the default export exists and is a function
        if (typeof routeModule.default === 'function') {
            // Construct the route name based on the relative path
            let routeName = relativePath.replace(".ts", ""); // Remove .ts extension

            // Handle index files (e.g., 'users/index.ts' -> '/v1/users')
            if (routeName.endsWith('/index')) {
                routeName = routeName.slice(0, -'/index'.length);
            }
            // Handle case where index file is at the root (e.g., 'index.ts' -> '/v1')
            if (routeName === 'index') {
                routeName = ''; // Will become '/v1' after prefixing
            }


            // Prepend the base path
            const fullRoutePath = join("/v1/", routeName).replace(/\\/g, '/'); // Ensure forward slashes for URLs

            // Assign the handler
            apiRoutes[fullRoutePath] = routeModule.default;
            // Logger.logInfo(`Loaded route: ${fullRoutePath} from ${relativePath}`);

        } else {
            // Logger.logWarn(`Skipping ${relativePath}: No default export function found.`);
        }
    } catch (error: any) {
        Logger.logError(`Failed to load route module ${relativePath}:`, error.message);
    }
}

// Logger.logInfo("Finished loading routes:", Object.keys(apiRoutes));
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL as string;
console.log(GITHUB_CALLBACK_URL);






try {
    await DatabaseClient.connect();
    console.log("Connected to MongoDB");

} catch (e: any) {
    console.log(e);
    console.log("Error connecting to database");
}
// Start the Bun server
serve({
    port: 5001,
    async fetch(req: Request) {
        const url = new URL(req.url);
        const handler = apiRoutes[url.pathname];
        if (handler) {
            return handler(req);
        }

        return new Response(JSON.stringify({ error: "Route not found" }), { status: 404 });
    }
});

console.log("🚀 Bun server running at http://localhost:5001");
