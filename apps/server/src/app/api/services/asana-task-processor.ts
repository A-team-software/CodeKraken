import { Runner } from "@/brain/runner/runner";

import { AsanaProjectManagerAdapter, AsanaWorkItem } from "./asana-project-manager-adapter";
import { BaseProjectManagerTaskProcessor, RunnerTaskConfig } from "./base-project-manager-task-processor";
import { WebhookInvocation } from "./task-processor";

type AsanaWebhookEvent = {
    action?: string;
    resource?: {
        gid?: string;
        name?: unknown;
        resource_type?: string;
        resource_subtype?: string | null;
    };
};

type AsanaWebhookPayload = {
    events?: AsanaWebhookEvent[];
};

export class AsanaTaskProcessor extends BaseProjectManagerTaskProcessor<AsanaWorkItem> {
    constructor(runner: Runner, adapter: AsanaProjectManagerAdapter, runnerTaskConfig: RunnerTaskConfig) {
        super(runner, adapter, runnerTaskConfig);
    }

    protected parseRemoteTaskFromWebhook(invocation: WebhookInvocation): AsanaWorkItem {
        const body = invocation.body as AsanaWebhookPayload;
        const createdEvent = body?.events?.find((event) => event.action === "added" || event.action === "created");

        if (!createdEvent?.resource?.gid || !createdEvent.resource.name) {
            throw new Error("Invalid Asana webhook payload: expected created/added event with resource.gid and resource.name.");
        }

        return {
            gid: createdEvent.resource.gid,
            name: this.normalizeText(createdEvent.resource.name),
            notes: "",
            resource_type: createdEvent.resource.resource_type,
            resource_subtype: createdEvent.resource.resource_subtype ?? null
        };
    }
}
