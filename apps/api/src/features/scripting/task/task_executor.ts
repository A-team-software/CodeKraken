import { TaskContext, TaskExecutionResult } from './task_context';
import { AgentTask } from '../interfaces/agents';
import ShellPrompt from '../child_process';
import LLM from '../ai';
import { SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS } from '../agents_instructions';

export class TaskExecutor {
    static async execute(task: AgentTask, context: TaskContext): Promise<TaskExecutionResult> {
        const taskType = this.identifyTaskType(task);

        switch (taskType) {
            case 'shell':
                return await this.executeShellTask(task, context);
            case 'code-generation':
                return await this.executeCodeGenTask(task, context);
            default:
                throw new Error(`Unknown task type: ${taskType}`);
        }
    }

    private static async executeShellTask(
        task: AgentTask,
        context: TaskContext
    ): Promise<TaskExecutionResult> {
        const enrichedPrompt = this.enrichPrompt(task.description, context);

        const shellInstruction = await LLM.agent(
            enrichedPrompt,
            SHELL_SCRIPT_AGENT_INSTRUCTIONS
        );

        if (!shellInstruction) {
            return {
                taskId: task.id,
                status: 'failed',
                output: 'Failed to generate shell instruction',
                filesModified: [],
            };
        }

        const result = await ShellPrompt.executeShellScriptInChildProcess(
            shellInstruction.shell_command,
            context.projectPath
        );

        return {
            taskId: task.id,
            status: result.exitCode === 0 ? 'success' : 'failed',
            output: result.stdout || '',
            filesModified: this.parseModifiedFiles(result.stdout || ''),
            errors: result.exitCode !== 0 && result.stderr ? [result.stderr.toString()] : undefined,
        };
    }

    private static async executeCodeGenTask(
        task: AgentTask,
        context: TaskContext
    ): Promise<TaskExecutionResult> {
        const enrichedPrompt = this.enrichPrompt(task.description, context);

        const codeChanges = await LLM.agent(
            enrichedPrompt,
            CODING_AGENT_INSTRUCTIONS
        );

        if (!codeChanges) {
            return {
                taskId: task.id,
                status: 'failed',
                output: 'Failed to generate code',
                filesModified: [],
            };
        }

        // Apply changes and track modified files
        const modifiedFiles = await this.applyCodeChanges(codeChanges, context);

        return {
            taskId: task.id,
            status: 'success',
            output: `Applied changes to ${modifiedFiles.length} files`,
            filesModified: modifiedFiles,
        };
    }

    /**
     * Enriches the task prompt with project context so AI understands scope
     */
    private static enrichPrompt(description: string, context: TaskContext): string {
        return `
Task: ${description}

Project Context:
- Base Path: ${context.projectPath}
- Client: ${context.clientId}
- Project Structure:
${context.projectStructure}

Relevant Files:
${context.relevantFiles.slice(0, 5).map(f => `- ${f}`).join('\n')}

Execute this task within the given project scope.
        `;
    }

    private static identifyTaskType(task: AgentTask): string {
        if (task.description.includes('write') || task.description.includes('code')) {
            return 'code-generation';
        }
        return 'shell';
    }

    private static parseModifiedFiles(output: string): string[] {
        // Parse output to identify modified files
        return [];
    }

    private static async applyCodeChanges(
        changes: any,
        context: TaskContext
    ): Promise<string[]> {
        // Implementation to apply code changes
        return [];
    }
}
