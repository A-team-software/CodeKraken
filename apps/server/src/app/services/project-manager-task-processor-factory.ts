import { OpenCodeRunner } from "@/brain/runner/opencode";
import { Runner } from "@/brain/runner/runner";

import { RunnerTaskConfig } from "./base-project-manager-task-processor";
import { AsanaProjectManagerAdapterImpl } from "./asana-project-manager-adapter";
import { AsanaTaskProcessor } from "./asana-task-processor";
import { JiraProjectManagerAdapterImpl } from "./jira-project-manager-adapter";
import { JiraTaskProcessor } from "./jira-task-processor";
import { LinearProjectManagerAdapterImpl } from "./linear-project-manager-adapter";
import { LinearTaskProcessor } from "./linear-task-processor";
import { TaskProcessor, WebhookInvocation } from "./task-processor";
import { TrelloProjectManagerAdapterImpl } from "./trello-project-manager-adapter";
import { TrelloTaskProcessor } from "./trello-task-processor";

export type SupportedProjectManagerProvider = "jira" | "asana" | "trello" | "linear";

export class ProjectManagerTaskProcessorFactory {
    constructor(private readonly runner: Runner = new OpenCodeRunner()) {}

    getRunner(): Runner {
        return this.runner;
    }

    createProcessor(invocation: WebhookInvocation, runnerTaskConfig: RunnerTaskConfig): TaskProcessor {
        const provider = this.resolveProvider(invocation);

        switch (provider) {
            case "jira":
                return new JiraTaskProcessor(this.runner, new JiraProjectManagerAdapterImpl(), runnerTaskConfig);
            case "asana":
                return new AsanaTaskProcessor(this.runner, new AsanaProjectManagerAdapterImpl(), runnerTaskConfig);
            case "trello":
                return new TrelloTaskProcessor(this.runner, new TrelloProjectManagerAdapterImpl(), runnerTaskConfig);
            case "linear":
                return new LinearTaskProcessor(this.runner, new LinearProjectManagerAdapterImpl(), runnerTaskConfig);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    private resolveProvider(invocation: WebhookInvocation): SupportedProjectManagerProvider {
        const providerFromRequest =
            invocation.query?.provider ||
            invocation.headers?.["x-provider"] ||
            invocation.headers?.["x-project-manager-provider"];

        if (providerFromRequest) {
            return this.normalizeProvider(providerFromRequest);
        }

        if (invocation.headers?.["x-atlassian-webhook-identifier"] || invocation.headers?.["x-atlassian-token"]) {
            return "jira";
        }

        if (invocation.headers?.["x-asana-request-signature"] || invocation.headers?.["x-hook-secret"]) {
            return "asana";
        }

        if (invocation.headers?.["x-trello-webhook"]) {
            return "trello";
        }

        if (invocation.headers?.["x-linear-signature"] || invocation.headers?.["linear-signature"]) {
            return "linear";
        }

        const body = invocation.body as Record<string, unknown> | undefined;

        if (body?.issue && body?.webhookEvent) {
            return "jira";
        }

        if (Array.isArray(body?.events)) {
            return "asana";
        }

        const action = body?.action as { data?: { card?: unknown } } | undefined;
        if (action?.data?.card) {
            return "trello";
        }

        if (body?.type === "Issue") {
            return "linear";
        }

        throw new Error(
            "Unable to identify webhook provider. Provide ?provider=... or x-provider header, or send a known webhook format."
        );
    }

    private normalizeProvider(value: string): SupportedProjectManagerProvider {
        const normalized = value.toLowerCase();

        if (normalized === "jira" || normalized === "asana" || normalized === "trello" || normalized === "linear") {
            return normalized;
        }

        throw new Error(`Unsupported provider: ${value}`);
    }
}
