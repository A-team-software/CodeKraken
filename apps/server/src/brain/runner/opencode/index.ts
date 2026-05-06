import { LocalhostInfrastructure } from "../../infrastructure/localhost/index";
import { Infrastructure } from "../../infrastructure/infrastructure";
import { JobConfig, JobResult } from "../../shared";
import { PullRequestPlatform, Runner } from "../runner";
import { JobDocument, JobPersistenceLayer } from "../job-persistence-layer";
import { MongoJobPersistenceLayer } from "../mongo-job-persistence-layer";
import { ConfigPersistenceLayer } from "../config-persistence-layer";
import { MongoConfigPersistenceLayer } from "../mongo-config-persistence-layer";
import { randomUUID } from "node:crypto";
import { PlanProcessor } from "../plan-processor";

export class OpenCodeRunner implements Runner {
	private readonly planProcessor = new PlanProcessor();

  constructor(
    private readonly infrastructure: Infrastructure = new LocalhostInfrastructure(),
    private readonly jobPersistenceLayer: JobPersistenceLayer = new MongoJobPersistenceLayer(),
    private readonly configPersistenceLayer: ConfigPersistenceLayer = new MongoConfigPersistenceLayer()
  ) {}

  async start(config: JobConfig): Promise<JobResult> {
    const { config: effectiveConfig, isIncremental } = await this.withTenantConfig(config);
    const jobId = this.resolveJobId(config);
    const todoItemId = effectiveConfig.vars?.todoItemId?.trim();
    await this.trySaveJob(jobId, { config: effectiveConfig, result: null, todoItemId, isIncremental });
    const result = await this.infrastructure.startProcess(this.withOpenCodeCommand(effectiveConfig));
    await this.trySaveJob(jobId, { config: effectiveConfig, result, todoItemId, isIncremental });
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

  private async withTenantConfig(config: JobConfig): Promise<{ config: JobConfig; isIncremental: boolean }> {
    const tenantId = config.vars?.tenantId?.trim();
    if (!tenantId) {
      return { config, isIncremental: false };
    }

    const tenantConfig = await this.tryGetTenantConfig(tenantId);
    if (!tenantConfig?.incrementalPrsOn) {
      return { config, isIncremental: false };
    }

    return {
      config: {
        ...config,
        mode: "plan",
        task: this.withPlanFolderInstructions(config.task),
        vars: {
          ...(config.vars ?? {}),
          todoItemId: "plan"
        }
      },
      isIncremental: true
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
      "- Keep the plan content clear and implementation-oriented.",
      "- The plan MUST contain a todo list using exactly this structure:",
      "  todos:",
      "      - id: (id of the todo)",
      "        content: (summary of the todo)",
      "        status: (status of the todo)"
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

  async startNextIteration(prId?: string, platform?: PullRequestPlatform, jobId?: string): Promise<JobResult> {
    const jobDocument = await this.resolveJobDocumentForIteration(prId, jobId);
    if (!jobDocument) {
      return {
        success: false,
        message: prId
          ? `Unable to find a job for PR id '${prId}'.`
          : `Unable to find a job for job id '${jobId ?? "unknown"}'.`
      };
    }

    const plan = jobDocument.plan?.trim();
    if (!plan) {
      return {
        success: false,
        message: `No plan found for job '${jobDocument.id}'.`
      };
    }

    if (!jobDocument.config?.repoUrl?.trim()) {
      return {
        success: false,
        message: `Job '${jobDocument.id}' does not contain a valid repository configuration.`
      };
    }

    const todoItem = this.planProcessor.selectTodoForIteration(plan, jobDocument.steps);
    if (!todoItem) {
      return {
        success: false,
        message: `No actionable todo item found for job '${jobDocument.id}'.`
      };
    }

    const followUpTask = this.buildIterationTaskPrompt(plan, todoItem, prId, platform);
    const followUpConfig: JobConfig = {
      ...jobDocument.config,
      mode: "agent",
      task: followUpTask,
      vars: {
        ...(jobDocument.config.vars ?? {}),
        jobId: jobDocument.id,
        todoItemId: todoItem.id,
        ...(prId ? { previousPrId: prId } : {}),
        ...(platform ? { sourcePlatform: platform } : {}),
        incrementalIteration: "true"
      }
    };

    await this.trySaveJob(jobDocument.id, { config: followUpConfig, result: null, todoItemId: todoItem.id, isIncremental: true });
    const result = await this.infrastructure.startProcess(this.withOpenCodeCommand(followUpConfig));
    await this.trySaveJob(jobDocument.id, { config: followUpConfig, result, todoItemId: todoItem.id, ...(prId ? { prId } : {}), isIncremental: true });
    return result;
  }

  resume(): Promise<JobResult> {
    return this.infrastructure.resumeProcess();
  }

  async saveJob(jobId: string, data: { config?: JobConfig; result?: JobResult<any> | null; plan?: string; prId?: string; todoItemId?: string; isIncremental?: boolean }): Promise<void> {
    await this.jobPersistenceLayer.saveJob(jobId, data);
  }

  private async trySaveJob(jobId: string, data: { config?: JobConfig; result?: JobResult<any> | null; plan?: string; prId?: string; todoItemId?: string; isIncremental?: boolean }): Promise<void> {
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

  private async resolveJobDocumentForIteration(prId: string | undefined, jobId?: string): Promise<JobDocument | null> {
    const preferredJobId = jobId?.trim();
    if (preferredJobId) {
      const byJobId = await this.jobPersistenceLayer.getJob(preferredJobId);
      if (byJobId) {
        return byJobId;
      }
    }

    if (!prId?.trim()) {
      return null;
    }

    return this.jobPersistenceLayer.findLatestJobByPrId(prId);
  }

  private buildIterationTaskPrompt(plan: string, todoItem: { id: string; content: string; status: string }, prId?: string, platform?: PullRequestPlatform): string {
    const context = prId && platform
      ? `${platform} PR #${prId}`
      : prId
        ? `PR #${prId}`
        : "job plan continuation";

    return [
      `INCREMENTAL ITERATION INPUT (${context}):`,
      "- Continue execution from the existing plan.",
      `- Work on todo item id '${todoItem.id}'.`,
      `- Todo summary: ${todoItem.content}`,
      `- Todo status: ${todoItem.status}`,
      "- Implement code/doc updates needed for this todo item.",
      "- Commit changes as you progress and update PR.md when needed.",
      "",
      "PLAN:",
      plan
    ].join("\n");
  }
}
