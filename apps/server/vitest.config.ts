import path from "node:path";
import { fileURLToPath } from "node:url";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

config({ path: path.resolve(rootDir, ".env") });

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(rootDir, "src"),
            "@oliver/application": path.resolve(rootDir, "../../packages/application/index.ts"),
            "@oliver/auth": path.resolve(rootDir, "../../packages/auth/index.ts"),
            "@oliver/boards": path.resolve(rootDir, "../../packages/boards/index.ts"),
            "@oliver/code-gen": path.resolve(rootDir, "../../packages/code-gen/index.ts"),
            "@oliver/core": path.resolve(rootDir, "../../packages/core/index.ts"),
            "@oliver/db": path.resolve(rootDir, "../../packages/db/index.ts"),
            "@oliver/domains": path.resolve(rootDir, "../../packages/domains/index.ts"),
            "@oliver/git": path.resolve(rootDir, "../../packages/git/index.ts"),
            "@oliver/shared": path.resolve(rootDir, "../../packages/shared/index.ts"),
            "@oliver/user": path.resolve(rootDir, "../../packages/user/index.ts"),
        }
    },
    ssr: {
        noExternal: [/^@oliver\//]
    },
    test: {
        exclude: [
            "../../packages/**"
        ],
        server: {
            deps: {
                inline: [/^@oliver\//]
            }
        }
    }
});
