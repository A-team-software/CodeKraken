import { LocalhostInfrastructure } from "../../infrastructure/localhost/index";
import { Infrastructure } from "../../infrastructure/infrastructure";
import { JobConfig, JobResult } from "../../shared";
import { Runner } from "../runner";
import { JobPersistenceLayer } from "../job-persistance-layer";
import { MongoJobPersistenceLayer } from "../mongo-job-persistance-layer";
import { randomUUID } from "node:crypto";

export class OpenCodeRunner implements Runner {
  constructor(
    private readonly infrastructure: Infrastructure = new LocalhostInfrastructure(),
    private readonly jobPersistenceLayer: JobPersistenceLayer = new MongoJobPersistenceLayer()) {
      // Pass
    }

  async start(config: JobConfig): Promise<JobResult> {
    const jobId = this.resolveJobId(config);
    await this.saveJob(jobId, { config, result: null });
    const result = await this.infrastructure.startProcess(this.withOpenCodeCommand(config));
    await this.saveJob(jobId, { config, result });
    return result;
  }

  private withOpenCodeCommand(config: JobConfig): JobConfig & { command: string } {
    if (!config.task?.trim()) {
      throw new Error("OpenCode runner requires a task prompt.");
    }

    const agent = config.mode === "plan" ? "plan" : "build";
    const task = this.escapeShellArg(config.task);

    return {
      ...config,
      command: `opencode run --format json --agent ${agent} ${task}`
    };
  }

  private escapeShellArg(value: string): string {
    return `'${value.replace(/'/g, `'"'"'`)}'`;
  }

  stop(): Promise<JobResult> {
    return this.infrastructure.stopProcess();
  }

  pause(): Promise<JobResult> {
    return this.infrastructure.pauseProcess();
  }

  resume(): Promise<JobResult> {
    return this.infrastructure.resumeProcess();
  }

  async saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult<any> | null }): Promise<void> {
    await this.jobPersistenceLayer.saveJob(jobId, data);
  }

  private resolveJobId(config: JobConfig): string {
    const explicitJobId = config.vars?.jobId?.trim();
    if (explicitJobId) {
      return explicitJobId;
    }

    const commitHash = config.commitHash?.trim();
    if (commitHash) {
      return commitHash;
    }

    return randomUUID();
  }
}
