import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Infrastructure } from "../infrastructure";
import { JobConfig, JobResult } from "../../shared";

type LocalProcessState = "idle" | "running" | "paused";

type DockerRunConfig = {
    repoUrl: string;
    mounts: string[];
    usesMountedLocalRepo: boolean;
};

const localRepoMountPath = "/workspace/local-repo-src";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const podsDir = path.resolve(moduleDir, "../pods");
const dockerfilePath = path.join(podsDir, "Dockerfile.opencode");

export class LocalhostInfrastructure implements Infrastructure {
    private process?: ReturnType<typeof execa>;
    private state: LocalProcessState = "idle";
    private containerName?: string;

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

        const stdoutChunks: string[] = [];
        const stderrChunks: string[] = [];
        const imageTag = this.resolveImageTag();

        try {
            const runConfig = await this.buildDockerRunConfig(options);
            await this.ensureDockerAvailable();
            await this.ensureImageAvailable(imageTag);

            const containerName = this.generateContainerName();
            const dockerArgs = this.buildDockerRunArgs(containerName, imageTag, options, runConfig);
            const child = execa("docker", dockerArgs, {
                reject: false,
                cleanup: true,
                stdin: "ignore"
            });

            this.process = child;
            this.state = "running";
            this.containerName = containerName;

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
                message: success
                    ? "Local Docker OpenCode run completed successfully."
                    : this.buildFailureMessage("docker run", result.exitCode, result.signal),
                data: {
                    imageTag,
                    containerName,
                    exitCode: result.exitCode,
                    signal: result.signal,
                    dockerArgs,
                    stdout,
                    stderr
                }
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown local Docker process error.";

            return {
                success: false,
                message: `Failed to start local Docker OpenCode run: ${message}`,
                data: {
                    imageTag,
                    stdout: stdoutChunks.join(""),
                    stderr: stderrChunks.join("")
                }
            };
        } finally {
            this.process = undefined;
            this.state = "idle";
            this.containerName = undefined;
        }
    }

    async stopProcess(): Promise<JobResult> {
        return this.signalProcess("stop", "stopped");
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

        return this.signalProcess("pause", "paused");
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

        return this.signalProcess("unpause", "running");
    }

    private async signalProcess(
        dockerAction: "stop" | "pause" | "unpause",
        nextState: Exclude<LocalProcessState, "idle"> | "stopped"
    ): Promise<JobResult> {
        if (!this.process || this.state === "idle") {
            return {
                success: false,
                message: "No local process is running."
            };
        }

        if (!this.containerName) {
            return {
                success: false,
                message: "No active container found for local process."
            };
        }

        const control = await execa("docker", [dockerAction, this.containerName], {
            reject: false,
            stdout: "pipe",
            stderr: "pipe"
        });

        if (control.exitCode !== 0) {
            return {
                success: false,
                message: control.stderr || control.stdout || `Failed to ${dockerAction} local container.`
            };
        }


        this.state = nextState === "stopped" ? "idle" : nextState;

        return {
            success: true,
            message: `Local process ${nextState}.`,
            data: {
                containerName: this.containerName,
                dockerAction
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

    private async ensureDockerAvailable(): Promise<void> {
        const result = await execa("docker", ["--version"], {
            reject: false,
            stdout: "pipe",
            stderr: "pipe"
        });

        if (result.exitCode !== 0) {
            throw new Error("Docker is required for LocalhostInfrastructure. Ensure Docker is installed and running.");
        }
    }

    private async ensureImageAvailable(imageTag: string): Promise<void> {
        const forceRebuild = process.env.OPENCODE_DOCKER_REBUILD === "1";

        if (!forceRebuild) {
            const inspect = await execa("docker", ["image", "inspect", imageTag], {
                reject: false,
                stdout: "pipe",
                stderr: "pipe"
            });

            if (inspect.exitCode === 0) {
                return;
            }
        }

        const buildArgs = [
            "build",
            "-f",
            dockerfilePath,
            "-t",
            imageTag
        ];

        const configuredVersion = process.env.OPENCODE_DOCKER_VERSION?.trim();
        if (configuredVersion) {
            buildArgs.push("--build-arg", `OPENCODE_VERSION=${configuredVersion}`);
        }

        buildArgs.push(podsDir);

        const build = await execa("docker", buildArgs, {
            reject: false,
            stdout: "pipe",
            stderr: "pipe"
        });

        if (build.exitCode !== 0) {
            throw new Error(build.stderr || build.stdout || "Failed to build local OpenCode Docker image.");
        }
    }

    private resolveImageTag(): string {
        return process.env.OPENCODE_DOCKER_IMAGE?.trim() || "oliver-opencode-local:latest";
    }

    private generateContainerName(): string {
        const random = Math.random().toString(36).slice(2, 10);
        return `oliver-opencode-local-${random}`;
    }

    private resolveNetworkMode(): string | undefined {
        const configured = process.env.OPENCODE_DOCKER_NETWORK_MODE?.trim();
        if (configured) {
            return configured;
        }

        return process.platform === "linux" ? "host" : undefined;
    }

    private async buildDockerRunConfig(options: JobConfig): Promise<DockerRunConfig> {
        const workspaceMount = await this.resolveWorkspaceMount();

        if (this.isRemoteReference(options.repoUrl)) {
            return {
                repoUrl: options.repoUrl,
                mounts: workspaceMount ? [workspaceMount] : [],
                usesMountedLocalRepo: false
            };
        }

        const localRepoPath = path.resolve(options.repoUrl);
        const stats = await fs.stat(localRepoPath).catch(() => undefined);

        if (!stats?.isDirectory()) {
            throw new Error(`Repository path does not exist or is not a directory: ${localRepoPath}`);
        }

        const mounts = [`${localRepoPath}:${localRepoMountPath}:ro`];
        if (workspaceMount) {
            mounts.push(workspaceMount);
        }

        return {
            repoUrl: localRepoMountPath,
            mounts,
            usesMountedLocalRepo: true
        };
    }

    private async resolveWorkspaceMount(): Promise<string | undefined> {
        const configuredPath = process.env.OPENCODE_DOCKER_WORKSPACE_HOST_DIR?.trim();
        if (!configuredPath) {
            return undefined;
        }

        const hostPath = path.resolve(configuredPath);
        await fs.mkdir(hostPath, { recursive: true });
        return `${hostPath}:/workspace`;
    }

    private buildDockerRunArgs(
        containerName: string,
        imageTag: string,
        options: JobConfig & { command?: string },
        runConfig: DockerRunConfig
    ): string[] {
        const args = [
            "run",
            "--rm",
            "--name",
            containerName
        ];

        const networkMode = this.resolveNetworkMode();
        if (networkMode) {
            args.push("--network", networkMode);
        }

        for (const mount of runConfig.mounts) {
            args.push("-v", mount);
        }

        for (const [name, value] of this.buildContainerEnv(options, runConfig.repoUrl, runConfig)) {
            args.push("-e", `${name}=${value}`);
        }

        args.push(imageTag);
        return args;
    }

    private buildContainerEnv(
        options: JobConfig & { command?: string },
        repoUrl: string,
        runConfig?: DockerRunConfig
    ): Array<[string, string]> {
        const entries: Array<[string, string]> = [
            ["REPO_URL", repoUrl],
            ["JOB_MODE", options.mode]
        ];

        if (runConfig?.usesMountedLocalRepo) {
            entries.push(["GIT_CONFIG_COUNT", "2"]);
            entries.push(["GIT_CONFIG_KEY_0", "safe.directory"]);
            entries.push(["GIT_CONFIG_VALUE_0", localRepoMountPath]);
            entries.push(["GIT_CONFIG_KEY_1", "safe.directory"]);
            entries.push(["GIT_CONFIG_VALUE_1", `${localRepoMountPath}/.git`]);
        }

        if (options.task?.trim()) {
            entries.push(["TASK", options.task]);
        } else if (options.command?.trim()) {
            entries.push(["OPENCODE_COMMAND", options.command]);
        }

        if (options.branch?.trim()) {
            entries.push(["BRANCH", options.branch]);
        }

        if (options.commitHash?.trim()) {
            entries.push(["COMMIT_HASH", options.commitHash]);
        }

        const jobId = options.vars?.jobId?.trim();
        if (jobId) {
            entries.push(["JOB_ID", jobId]);
        }

        const taskSummary = options.vars?.taskSummary?.trim();
        if (taskSummary) {
            entries.push(["TASK_SUMMARY", taskSummary]);
        }

        const todoItemId = options.vars?.todoItemId?.trim();
        if (todoItemId) {
            entries.push(["TODO_ITEM_ID", todoItemId]);
        }

        this.copyEnv(entries, "AI_PROVIDER", ["AI_PROVIDER", "OPENCODE_AI_PROVIDER"]);
        this.copyEnv(entries, "AI_API_KEY", ["AI_API_KEY", "OPENCODE_AI_API_KEY", "LLM_API_KEY"]);
        this.copyEnv(entries, "GIT_USERNAME", ["GIT_USERNAME", "GIT_USER"]);
        this.copyEnv(entries, "GIT_PASSWORD", ["GIT_PASSWORD", "GIT_PASS"]);
        this.copyEnv(entries, "GIT_TOKEN", ["GIT_TOKEN", "GITHUB_TOKEN", "GIT_ACCESS_TOKEN"]);
        this.copyEnv(entries, "OPENCODE_FLAGS", ["OPENCODE_FLAGS"]);
        this.copyEnv(entries, "OPENCODE_COMMAND", ["OPENCODE_COMMAND"]);
        this.copyEnv(entries, "API_SERVER_URL", ["API_SERVER_URL", "OPENCODE_API_SERVER_URL"]);
        this.copyEnv(entries, "API_KEY", ["API_KEY", "OPENCODE_TASK_API_TOKEN", "TASK_API_TOKEN"]);
        this.copyEnv(entries, "OPENCODE_TASK_API_TOKEN", ["OPENCODE_TASK_API_TOKEN", "TASK_API_TOKEN"]);

        return entries;
    }

    private isRemoteReference(repoUrl: string): boolean {
        return /^[a-z][a-z\d+.-]*:\/\//i.test(repoUrl) || /^git@/i.test(repoUrl) || /^ssh:\/\//i.test(repoUrl);
    }

    private copyEnv(target: Array<[string, string]>, targetName: string, sourceNames: string[]): void {
        for (const sourceName of sourceNames) {
            const value = process.env[sourceName]?.trim();
            if (value) {
                target.push([targetName, value]);
                return;
            }
        }
    }
}
