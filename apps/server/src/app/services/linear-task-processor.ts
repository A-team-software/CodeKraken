import { Runner } from "@/app/brain/runner/runner";

import { LinearIssue, LinearProjectManagerAdapter } from "./linear-project-manager-adapter";
import { BaseProjectManagerTaskProcessor, RunnerTaskConfig } from "./base-project-manager-task-processor";
import { WebhookInvocation } from "./task-processor";

type LinearWebhookPayload = {
    type?: string;
    action?: string;
    data?: {
        id?: string;
        identifier?: string;
        title?: unknown;
        description?: unknown;
        state?: {
            name?: string;
        } | null;
    };
};

export class LinearTaskProcessor extends BaseProjectManagerTaskProcessor<LinearIssue> {
    constructor(runner: Runner, adapter: LinearProjectManagerAdapter, runnerTaskConfig: RunnerTaskConfig) {
        super(runner, adapter, runnerTaskConfig);
    }

    protected parseRemoteTaskFromWebhook(invocation: WebhookInvocation): LinearIssue {
        const body = invocation.body as LinearWebhookPayload;

        if (body?.type !== "Issue" || body?.action !== "create" || !body?.data?.id || !body.data.title) {
            throw new Error("Invalid Linear webhook payload: expected Issue create payload with data.id and data.title.");
        }

        return {
            id: body.data.id,
            identifier: body.data.identifier,
            title: this.normalizeText(body.data.title),
            description: this.normalizeText(body.data.description),
            state: body.data.state ?? null
        };
    }
}
