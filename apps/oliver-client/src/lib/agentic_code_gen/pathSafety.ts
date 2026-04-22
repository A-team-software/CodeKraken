import path from "path";

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
