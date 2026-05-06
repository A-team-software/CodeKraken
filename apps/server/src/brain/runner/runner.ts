import { JobConfig, JobResult } from "../shared";

export interface Runner {
    start(config: JobConfig): Promise<JobResult>;
    stop(): Promise<JobResult>;
    pause(): Promise<JobResult>;
    resume(): Promise<JobResult>;
    saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult | null }): Promise<void>;
}
