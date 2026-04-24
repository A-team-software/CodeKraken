import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

config({ path: path.resolve(rootDir, ".env") });

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "src")
        }
    }
});
