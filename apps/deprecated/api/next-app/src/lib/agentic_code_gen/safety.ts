import path from "path";

export const MAX_FILE_COUNT = 200;
export const MAX_TOTAL_BYTES = 2_000_000;
export const MAX_SINGLE_FILE_BYTES = 1_000_000;

export function resolveInside(baseDir: string, userPath: string) {
    const normalized = userPath.replace(/\\/g, "/");
    const resolved = path.resolve(baseDir, normalized);
    const base = path.resolve(baseDir);

    if (resolved === base) throw new Error("Invalid file path");
    if (!resolved.startsWith(base + path.sep)) {
        throw new Error("Path traversal detected");
    }

    return resolved;
}
