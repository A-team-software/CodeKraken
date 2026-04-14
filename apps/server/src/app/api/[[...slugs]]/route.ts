import { Elysia, t } from "elysia";
import fs, { truncate } from "fs/promises";
import os from "os";
import path from "path";
import { registerHandlers, UserAggregate } from "@oliver/user";
import { SafeExecute } from "@oliver/core";
import { createSessionId, cloneRepo, analyzeDiff, runSolve } from "@oliver/code-gen";
import { Result } from "execa";

// Initialize event handlers
registerHandlers();

const app = new Elysia({ prefix: "/api" })
    .post(
        "/solve",
        async (ctx) => {
            const { userId } = ctx as any;
            const body = ctx.body as any;
            const {
                task,
                repoUrl,
                githubToken: directGithubToken,
                apiKey,
                provider = "github",
            } = body;

            if (!apiKey) {
                ctx.set.status = 400;
                return {
                    success: false,
                    code: "MISSING_API_KEY",
                    error: "Missing apiKey",
                };
            }

            let githubToken = directGithubToken;

            // If we have a userId from PAT, automatically fetch the provider token
            if (!githubToken && userId) {
                const { MongoUserRepository } = await import('@oliver/user');
                const userRepo = new MongoUserRepository();
                const [user, error] = await SafeExecute.withSync<UserAggregate | null, Array<Error | null>>(() => userRepo.findById(userId))
                    .withRetry({ attempts: 3, delayMs: 100 })
                    .withTimeout(1000)
                    .execute();


                if (error != null) {
                    return { success: false, message: error.message, stack: error.stack, name: error.name, cause: error.cause };
                }


                if (user == null) {
                    return { success: false, message: "No user has been found" };
                }



                const account = user.accounts.find(a => a.provider.toLowerCase() === provider.toLowerCase());
                if (account?.accessToken) {
                    githubToken = account.accessToken;
                }
            }

            const sessionId = createSessionId();
            const workDir = await fs.mkdtemp(path.join(os.tmpdir(), `${sessionId}-`));

            const [clone, error] = await SafeExecute.withSync(() => cloneRepo(repoUrl, githubToken)).execute();

            if (error != null) {
                return {
                    success: false,
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    cause: error.cause,
                    code: 500
                };
            }

            if ((clone == null) || (clone.exitCode !== 0)) {
                ctx.set.status = 500;
                return {
                    success: false,
                    sessionId,
                    logs: truncate(clone!.stdout),
                    stdErr: truncate(clone!.stderr)
                };
            }

            try {
                const solve = await runSolve(task, apiKey);

                const [diffPayload, error] = await SafeExecute.withSync<{
                    changedFiles: Record<string, string>;
                    deletedFiles: string[];
                    diff: string;
                } | null, Array<Error | null>>(() => analyzeDiff(workDir)).execute();

                if (!diffPayload) return {
                    message: "Failed to retrieve result",
                    success: solve.exitCode === 0,
                    sessionId,
                    exitCode: solve.exitCode,
                    logs: truncate(solve.stdout),
                    stdErr: truncate(solve.stderr),
                }
                if (error != null) {
                    return {
                        success: false,
                        message: error.message,
                        stack: error.stack,
                        name: error.name,
                        cause: error.cause,
                    };
                }
                const { changedFiles, deletedFiles, diff } = diffPayload;
                return {
                    success: solve.exitCode === 0,
                    sessionId,
                    exitCode: solve.exitCode,
                    logs: truncate(solve.stdout),
                    stdErr: truncate(solve.stderr),
                    changedFiles,
                    deletedFiles,
                    diff: truncate(diff, 20_000)
                };
            } finally {
                await SafeExecute.withSync(() => fs.rm(workDir, { recursive: true, force: true }));
            }
        },
        {
            body: t.Object({
                task: t.String(),
                repoUrl: t.String(),
                githubToken: t.Optional(t.String()),
                apiKey: t.Optional(t.String()),
                provider: t.Optional(t.String()),
            })
        }
    )



export const GET = app.fetch;
export const POST = app.fetch;
