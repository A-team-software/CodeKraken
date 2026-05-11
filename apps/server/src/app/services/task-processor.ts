import { JobResult } from "@/app/brain/shared";

export interface WebhookInvocation {
    body: unknown;
    headers?: Record<string, string | undefined>;
    query?: Record<string, string | undefined>;
}

export interface TaskProcessor {
    processTask(invocation: WebhookInvocation): Promise<JobResult>;
}
