import { LocalhostInfrastructure } from "../../infrastructure/localhost/index";
import { Infrastructure } from "../../infrastructure/infrastructure";
import { JobConfig, JobResult } from "../../shared";
import { Runner } from "../runner";

export class OpenCodeRunner implements Runner {
  constructor(private readonly infrastructure: Infrastructure = new LocalhostInfrastructure()) {}

  start(config: JobConfig): Promise<JobResult> {
    return this.infrastructure.startProcess(this.withOpenCodeCommand(config));
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
}
