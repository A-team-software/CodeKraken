export interface JobConfig {
    repoUrl: string;
    mode: 'plan' | 'agent';
    task?: string;
    branch?: string;
    commitHash?: string;
    vars?: Record<string, string>;
}

export interface JobResult {
    success: boolean;
    message?: string;
    data?: any;
}
