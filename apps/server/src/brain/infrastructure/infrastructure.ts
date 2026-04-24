import { JobConfig, JobResult } from "../shared";

export interface Infrastructure {
    startProcess(options: JobConfig & { command?: string }): Promise<JobResult>;
    stopProcess(): Promise<JobResult>;
    pauseProcess(): Promise<JobResult>;
    resumeProcess(): Promise<JobResult>;
}
