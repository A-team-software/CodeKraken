import { JobConfig, JobResult } from "../shared";

export interface Infrastructure {
    startProcess(options: JobConfig): Promise<JobResult>;
    stopProcess(): Promise<JobResult>;
    pauseProcess(): Promise<JobResult>;
    resumeProcess(): Promise<JobResult>;
}
