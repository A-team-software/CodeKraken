import { LocalhostInfrastructure } from "../../infrastructure/localhost/index";
import { Infrastructure } from "../../infrastructure/infrastructure";
import { JobConfig, JobResult } from "../../shared";
import { Runner } from "../runner";
import { JobPersistenceLayer } from "../job-persistance-layer";
import { MongoJobPersistenceLayer } from "../mongo-job-persistance-layer";
import { ConfigPersistenceLayer } from "../config-persistance-layer";
import { MongoConfigPersistenceLayer } from "../mongo-config-persistance-layer";
import { randomUUID } from "node:crypto";

export class OpenCodeRunner implements Runner {
  constructor(
    private readonly infrastructure: Infrastructure = new LocalhostInfrastructure(),
    private readonly jobPersistenceLayer: JobPersistenceLayer = new MongoJobPersistenceLayer(),
    private readonly configPersistenceLayer: ConfigPersistenceLayer = new MongoConfigPersistenceLayer()
  ) {}

  async start(config: JobConfig): Promise<JobResult> {
    const effectiveConfig = await this.withTenantConfig(config);
    const jobId = this.resolveJobId(config);
    await this.trySaveJob(jobId, { config: effectiveConfig, result: null });
    const result = await this.infrastructure.startProcess(this.withOpenCodeCommand(effectiveConfig));
    await this.trySaveJob(jobId, { config: effectiveConfig, result });
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

  private async withTenantConfig(config: JobConfig): Promise<JobConfig> {
    const tenantId = config.vars?.tenantId?.trim();
    if (!tenantId) {
      return config;
    }

    const tenantConfig = await this.tryGetTenantConfig(tenantId);
    if (!tenantConfig?.incrementalPrsOn) {
      return config;
    }

    return {
      ...config,
      mode: "plan",
      task: this.withPlanFolderInstructions(config.task)
    };
  }

  private withPlanFolderInstructions(task: string | undefined): string | undefined {
    if (!task?.trim()) {
      return task;
    }

    const planInstruction = [
      "PLAN OUTPUT INSTRUCTIONS:",
      "- Generate the plan inside the .plans/ folder of the repository you are running in.",
      "- Ensure the plan is written to a file under .plans/ before you finish.",
      "- Keep the plan content clear and implementation-oriented."
    ].join("\n");

    if (task.includes("PLAN OUTPUT INSTRUCTIONS:")) {
      return task;
    }

    return `${task}\n\n${planInstruction}`;
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

  private async trySaveJob(jobId: string, data: { config?: JobConfig; result?: JobResult<any> | null }): Promise<void> {
    const persistenceAttempt = this.saveJob(jobId, data).catch(() => undefined);
    const timeoutMs = 150;

    await Promise.race([
      persistenceAttempt,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }

  private async tryGetTenantConfig(tenantId: string) {
    const configAttempt = this.configPersistenceLayer.getTenantConfig(tenantId).catch(() => null);
    const timeoutMs = 150;

    const result = await Promise.race<Awaited<ReturnType<ConfigPersistenceLayer["getTenantConfig"]>> | null>([
      configAttempt,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);

    return result;
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
