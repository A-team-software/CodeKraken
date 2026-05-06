import { ObjectId } from "@oliver/db";
import { JobConfig, JobResult } from "../shared";

export interface JobStep {
    todoItemId?: string;
    result: JobResult<any>;
    prId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface JobDocument {
    _id?: string | ObjectId;
    id: string;
    config?: JobConfig;
    result: JobResult<any> | null;
    plan?: string;
    steps?: JobStep[];
    isIncremental: boolean;
}

export interface JobPersistenceLayer {
    saveJob(jobId: string, data: {
        config?: JobConfig;
        result?: JobResult<any> | null;
        plan?: string;
        prId?: string;
        todoItemId?: string;
        isIncremental?: boolean;
    }): Promise<void>;
    getJob(jobId: string): Promise<JobDocument | null>;
    findLatestJobByPrId(prId: string): Promise<JobDocument | null>;
    deleteJob(jobId: string): Promise<void>;
}
