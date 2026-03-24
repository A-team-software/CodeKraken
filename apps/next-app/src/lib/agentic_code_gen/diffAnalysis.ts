import fs from "fs/promises";
import { execa } from "execa";
import { resolveInside } from "./pathSafety";
import {
    MAX_FILE_COUNT,
    MAX_SINGLE_FILE_BYTES,
    MAX_TOTAL_BYTES,
} from "./limits";

export async function analyzeDiff(workDir: string) {
    const nameStatus = await execa("git", ["diff", "--name-status"], {
        cwd: workDir,
        reject: false,
    });

    const deletedFiles: string[] = [];
    const changedPaths: string[] = [];

    for (const line of nameStatus.stdout.split(/\r?\n/)) {
        if (!line) continue;
        const [code, a, b] = line.split("\t");

        if (code.startsWith("D")) deletedFiles.push(a);
        else if (code.startsWith("R")) {
            deletedFiles.push(a);
            changedPaths.push(b);
        } else {
            changedPaths.push(a);
        }
    }

    if (changedPaths.length > MAX_FILE_COUNT) {
        throw new Error("Too many changed files");
    }

    const changedFiles: Record<string, string> = {};
    let totalBytes = 0;

    for (const rel of changedPaths) {
        const abs = resolveInside(workDir, rel);
        const buf = await fs.readFile(abs);

        if (buf.byteLength > MAX_SINGLE_FILE_BYTES) {
            throw new Error(`File too large: ${rel}`);
        }

        totalBytes += buf.byteLength;
        if (totalBytes > MAX_TOTAL_BYTES) {
            throw new Error("Changed files exceed size limit");
        }

        changedFiles[rel] = buf.toString("utf8");
    }

    const diff = await execa("git", ["diff", "--no-color"], {
        cwd: workDir,
        reject: false,
    });

    return {
        changedFiles,
        deletedFiles,
        diff: diff.stdout,
    };
}
