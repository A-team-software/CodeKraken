import { JobConfig, JobResult } from "../shared";

export type PullRequestPlatform = "github" | "gitlab" | "bitbucket";

export interface Runner {
    start(config: JobConfig): Promise<JobResult>;
    stop(): Promise<JobResult>;
    pause(): Promise<JobResult>;
    startNextIteration(prId: string, platform: PullRequestPlatform, jobId?: string): Promise<JobResult>;
    resume(): Promise<JobResult>;
    saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult | null; plan?: string; prId?: string; isIncremental?: boolean }): Promise<void>;
}
