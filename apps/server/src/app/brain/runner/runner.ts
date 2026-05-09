import { JobConfig, JobResult } from "../shared";
import { PullRequestPlatform } from "@/app/types/pull-request-platform";

export interface Runner {
    start(config: JobConfig): Promise<JobResult>;
    stop(): Promise<JobResult>;
    pause(): Promise<JobResult>;
    startNextIteration(prId?: string, platform?: PullRequestPlatform, jobId?: string): Promise<JobResult>;
    resume(): Promise<JobResult>;
    saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult | null; plan?: string; prId?: string; todoItemId?: string; isIncremental?: boolean }): Promise<void>;
}
