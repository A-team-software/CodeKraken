import { Runner } from "@/app/brain/runner/runner";

import { JiraProjectManagerAdapter, JiraTicket } from "./jira-project-manager-adapter";
import { BaseProjectManagerTaskProcessor, RunnerTaskConfig } from "./base-project-manager-task-processor";
import { WebhookInvocation } from "./task-processor";

type JiraWebhookIssue = {
    id?: string;
    key?: string;
    fields?: {
        summary?: unknown;
        description?: unknown;
        issuetype?: {
            id?: string;
            name?: string;
        } | null;
    };
};

type JiraWebhookPayload = {
    webhookEvent?: string;
    issue?: JiraWebhookIssue;
};

export class JiraTaskProcessor extends BaseProjectManagerTaskProcessor<JiraTicket> {
    constructor(runner: Runner, adapter: JiraProjectManagerAdapter, runnerTaskConfig: RunnerTaskConfig) {
        super(runner, adapter, runnerTaskConfig);
    }

    protected parseRemoteTaskFromWebhook(invocation: WebhookInvocation): JiraTicket {
        const body = invocation.body as JiraWebhookPayload;
        const issue = body?.issue;

        if (!issue?.id || !issue?.key || !issue.fields?.summary) {
            throw new Error("Invalid Jira webhook payload: expected issue.id, issue.key, and issue.fields.summary.");
        }

        return {
            id: issue.id,
            key: issue.key,
            fields: {
                summary: this.normalizeText(issue.fields.summary),
                description: this.normalizeText(issue.fields.description),
                issuetype: issue.fields.issuetype ?? null
            }
        };
    }
}
