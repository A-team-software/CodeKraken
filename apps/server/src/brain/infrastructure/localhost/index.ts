import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import { Infrastructure } from "../infrastructure";
import { JobConfig, JobResult } from "../../shared";

type LocalProcessState = "idle" | "running" | "paused";

export class LocalhostInfrastructure implements Infrastructure {
    private process?: ReturnType<typeof execa>;
    private state: LocalProcessState = "idle";

    async startProcess(options: JobConfig & { command: string }): Promise<JobResult> {
        if (this.process && this.state !== "idle") {
            return {
                success: false,
                message: "A local process is already running.",
                data: {
                    state: this.state
                }
            };
        }

        const command = options.command.trim();
        if (!command) {
            return {
                success: false,
                message: "Missing local command. Provide it in options.command."
            };
        }

        let cwd: string;

        try {
            cwd = await this.resolveRepositoryPath(options.repoUrl);
            await this.prepareRepository(cwd, options);
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : "Failed to prepare local repository."
            };
        }

        const env = this.buildEnv(options);
        const stdoutChunks: string[] = [];
        const stderrChunks: string[] = [];

        try {
            const child = execa("sh", ["-lc", command], {
                cwd,
                env,
                reject: false,
                cleanup: true,
                stdin: "ignore"
            });

            this.process = child;
            this.state = "running";

            child.stdout?.on("data", (chunk: Buffer | string) => {
                const text = chunk.toString();
                stdoutChunks.push(text);
                process.stdout.write(text);
            });

            child.stderr?.on("data", (chunk: Buffer | string) => {
                const text = chunk.toString();
                stderrChunks.push(text);
                process.stderr.write(text);
            });

            const result = await child;
            const stdout = stdoutChunks.join("");
            const stderr = stderrChunks.join("");
            const success = result.exitCode === 0;

            return {
                success,
                message: success ? "Local command completed successfully." : this.buildFailureMessage(command, result.exitCode, result.signal),
                data: {
                    command,
                    cwd,
                    exitCode: result.exitCode,
                    signal: result.signal,
                    stdout,
                    stderr
                }
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown local process error.";

            return {
                success: false,
                message: `Failed to start local command: ${message}`,
                data: {
                    command,
                    cwd,
                    stdout: stdoutChunks.join(""),
                    stderr: stderrChunks.join("")
                }
            };
        } finally {
            this.process = undefined;
            this.state = "idle";
        }
    }

    async stopProcess(): Promise<JobResult> {
        return this.signalProcess("SIGTERM", "stopped");
    }

    async pauseProcess(): Promise<JobResult> {
        if (!this.process || this.state === "idle") {
            return {
                success: false,
                message: "No local process is running."
            };
        }

        if (this.state === "paused") {
            return {
                success: false,
                message: "Local process is already paused."
            };
        }

        return this.signalProcess("SIGSTOP", "paused");
    }

    async resumeProcess(): Promise<JobResult> {
        if (!this.process || this.state === "idle") {
            return {
                success: false,
                message: "No local process is running."
            };
        }

        if (this.state === "running") {
            return {
                success: false,
                message: "Local process is already running."
            };
        }

        return this.signalProcess("SIGCONT", "running");
    }

    private buildEnv(options: JobConfig): Record<string, string> {
        return {
            ...process.env,
            REPO_URL: options.repoUrl,
            JOB_MODE: options.mode
        };
    }

    private async signalProcess(signal: NodeJS.Signals, nextState: Exclude<LocalProcessState, "idle"> | "stopped"): Promise<JobResult> {
        if (!this.process || this.state === "idle") {
            return {
                success: false,
                message: "No local process is running."
            };
        }

        this.process.kill(signal);

        this.state = nextState === "stopped" ? "idle" : nextState;

        return {
            success: true,
            message: `Local process ${nextState}.`,
            data: {
                signal
            }
        };
    }

    private buildFailureMessage(command: string, exitCode?: number, signal?: NodeJS.Signals): string {
        if (typeof exitCode === "number") {
            return `Local command failed with exit code ${exitCode}: ${command}`;
        }

        if (signal) {
            return `Local command exited from signal ${signal}: ${command}`;
        }

        return `Local command failed: ${command}`;
    }

    private async resolveRepositoryPath(repoUrl: string): Promise<string> {
        if (this.isRemoteReference(repoUrl)) {
            throw new Error("repoUrl must be a local folder path. Remote URLs are not supported.");
        }

        const repoPath = path.resolve(repoUrl);
        const stats = await fs.stat(repoPath).catch(() => undefined);

        if (!stats?.isDirectory()) {
            throw new Error(`Repository path does not exist or is not a directory: ${repoPath}`);
        }

        return repoPath;
    }

    private isRemoteReference(repoUrl: string): boolean {
        return /^[a-z][a-z\d+.-]*:\/\//i.test(repoUrl) || /^git@/i.test(repoUrl) || /^ssh:\/\//i.test(repoUrl);
    }

    private async prepareRepository(repoPath: string, options: JobConfig): Promise<void> {
        await this.ensureGitRepository(repoPath);

        if (options.branch) {
            await this.checkoutBranchIfAvailable(repoPath, options.branch);
        }

        if (options.commitHash) {
            await this.checkoutCommitIfAvailable(repoPath, options.commitHash);
        }
    }

    private async ensureGitRepository(repoPath: string): Promise<void> {
        const result = await this.runGit(repoPath, ["rev-parse", "--is-inside-work-tree"]);

        if (!result.success || result.stdout.trim() !== "true") {
            throw new Error(`Path is not a git repository: ${repoPath}`);
        }
    }

    private async checkoutBranchIfAvailable(repoPath: string, branch: string): Promise<void> {
        if (await this.localBranchExists(repoPath, branch)) {
            await this.ensureGitSuccess(repoPath, ["switch", branch], `Failed to switch to local branch '${branch}'.`);
            return;
        }

        if (!(await this.remoteBranchExists(repoPath, branch))) {
            return;
        }

        await this.ensureGitSuccess(
            repoPath,
            ["fetch", "origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`],
            `Failed to fetch remote branch '${branch}'.`
        );
        await this.ensureGitSuccess(
            repoPath,
            ["switch", "--track", "-c", branch, `origin/${branch}`],
            `Failed to switch to remote branch '${branch}'.`
        );
    }

    private async checkoutCommitIfAvailable(repoPath: string, commitHash: string): Promise<void> {
        if (await this.commitExists(repoPath, commitHash)) {
            await this.ensureGitSuccess(repoPath, ["checkout", commitHash], `Failed to checkout commit '${commitHash}'.`);
            return;
        }

        await this.runGit(repoPath, ["fetch", "--all", "--tags", "--prune"]);

        if (!(await this.commitExists(repoPath, commitHash))) {
            return;
        }

        await this.ensureGitSuccess(repoPath, ["checkout", commitHash], `Failed to checkout commit '${commitHash}'.`);
    }

    private async localBranchExists(repoPath: string, branch: string): Promise<boolean> {
        const result = await this.runGit(repoPath, ["show-ref", "--verify", `refs/heads/${branch}`]);
        return result.success;
    }

    private async remoteBranchExists(repoPath: string, branch: string): Promise<boolean> {
        const result = await this.runGit(repoPath, ["ls-remote", "--exit-code", "--heads", "origin", branch]);
        return result.success;
    }

    private async commitExists(repoPath: string, commitHash: string): Promise<boolean> {
        const result = await this.runGit(repoPath, ["cat-file", "-e", `${commitHash}^{commit}`]);
        return result.success;
    }

    private async ensureGitSuccess(repoPath: string, args: string[], fallbackMessage: string): Promise<void> {
        const result = await this.runGit(repoPath, args);

        if (result.success) {
            return;
        }

        throw new Error(result.message || fallbackMessage);
    }

    private async runGit(repoPath: string, args: string[]): Promise<{ success: boolean; stdout: string; stderr: string; message?: string }> {
        try {
            const result = await execa("git", args, {
                cwd: repoPath,
                reject: false,
                stdout: "pipe",
                stderr: "pipe"
            });

            return {
                success: result.exitCode === 0,
                stdout: result.stdout,
                stderr: result.stderr,
                message: result.exitCode === 0 ? undefined : (result.stderr || result.stdout || `git ${args.join(" ")} failed`)
            };
        } catch (error) {
            return {
                success: false,
                stdout: "",
                stderr: "",
                message: error instanceof Error ? error.message : "Unknown git error."
            };
        }
    }
}
