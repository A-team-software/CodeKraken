import { JobConfig, JobResult } from "@/brain/shared";
import { Runner } from "@/brain/runner/runner";

import { Task } from "../types/task";
import { ProjectManagerAdapter } from "./project-manager-adapter";
import { TaskProcessor, WebhookInvocation } from "./task-processor";

export type RunnerTaskConfig = Omit<JobConfig, "task">;

export abstract class BaseProjectManagerTaskProcessor<TRemoteTask> implements TaskProcessor {
    constructor(
        protected readonly runner: Runner,
        protected readonly adapter: ProjectManagerAdapter<TRemoteTask>,
        protected readonly runnerTaskConfig: RunnerTaskConfig
    ) {}

    async processTask(invocation: WebhookInvocation): Promise<JobResult> {
        const remoteTask = this.parseRemoteTaskFromWebhook(invocation);
        const localTask = this.adapter.remoteTaskToLocalTask(remoteTask);

        const taskPrompt = this.buildTaskPrompt(localTask);
        return this.runner.start({
            ...this.runnerTaskConfig,
            task: taskPrompt,
            vars: {
                ...(this.runnerTaskConfig.vars ?? {}),
                jobId: localTask.id,
                taskType: localTask.type,
                taskSummary: localTask.summary
            }
        });
    }

    protected buildTaskPrompt(task: Task): string {
        const description = task.description.trim();
        const taskLine = `[${task.type}] ${task.summary}`;
        const workflowInstructions = [
            "WORKFLOW INSTRUCTIONS:",
            "- Start by creating and switching to a dedicated git branch for this task.",
            "- Commit your changes to git as often as possible using meaningful commit messages.",
            "- When your work is complete, create a file named PR.md at the root of the repository.",
            "  - The first line must be the pull request title.",
            "  - Leave one blank line, then write the pull request description.",
            "  - Do not add PR.md to .gitignore yourself; it is already handled."
        ].join("\n");

        if (description.length === 0) {
            return [taskLine, "", workflowInstructions].join("\n");
        }

        return [taskLine, "", description, "", workflowInstructions].join("\n");
    }

    protected abstract parseRemoteTaskFromWebhook(invocation: WebhookInvocation): TRemoteTask;

    protected normalizeText(value: unknown): string {
        if (typeof value === "string") {
            return value;
        }

        if (value == null) {
            return "";
        }

        if (typeof value === "object") {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }

        return String(value);
    }
}
