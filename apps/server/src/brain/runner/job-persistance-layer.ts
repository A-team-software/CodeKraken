import { JobConfig, JobResult } from "../shared";

export interface JobPersistenceLayer {
    saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult<any> | null }): Promise<void>;
    getJob(jobId: string): Promise<{ config: JobConfig; result: JobResult<any> | null } | null>;
    deleteJob(jobId: string): Promise<void>;
}
