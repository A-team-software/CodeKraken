import { TaskContext, TaskExecutionResult } from './task_context';
import { AgentTask } from '../interfaces/agents';
import TaskPlaner from './task_agent';
import LLM from '../ai';
import { TASK_PLANER_AGENT_SHELL_INSTRUCTIONS } from '../agents_instructions';

export class TaskOrchestrator {
    /**
     * Main entry point: accepts a client task and orchestrates execution
     */
    async executeClientTask(context: TaskContext): Promise<TaskExecutionResult> {
        try {
            // Step 1: Break down the task into subtasks
            const subtasks = await this.planTasks(context);
            
            // Step 2: Execute each subtask sequentially
            const results = await this.executeSubtasks(subtasks, context);
            
            // Step 3: Aggregate and return results
            return this.aggregateResults(results, context);
        } catch (error) {
            return this.handleExecutionError(error, context);
        }
    }

    private async planTasks(context: TaskContext): Promise<AgentTask[]> {
        const prompt = `
Client Request: ${context.taskDescription}

Project Structure:
${context.projectStructure}

Relevant Files:
${context.relevantFiles.join('\n')}

Break this down into executable subtasks for an AI agent.
        `;

        return await TaskPlaner.generateTasks(
            prompt,
            TASK_PLANER_AGENT_SHELL_INSTRUCTIONS,
            0
        );
    }

    private async executeSubtasks(
        subtasks: AgentTask[],
        context: TaskContext
    ): Promise<TaskExecutionResult[]> {
        const results: TaskExecutionResult[] = [];
        
        for (const task of subtasks) {
            const result = await this.executeTask(task, context);
            results.push(result);
            
            if (result.status === 'failed') {
                // Decide: continue or abort based on task criticality
                console.warn(`Task failed: ${task.description}`);
            }
        }
        
        return results;
    }

    private async executeTask(
        task: AgentTask,
        context: TaskContext
    ): Promise<TaskExecutionResult> {
        // Delegate to appropriate executor
        return await TaskExecutor.execute(task, context);
    }

    private aggregateResults(
        results: TaskExecutionResult[],
        context: TaskContext
    ): TaskExecutionResult {
        return {
            taskId: context.clientId,
            status: results.every(r => r.status === 'success') ? 'success' : 'partial',
            output: results.map(r => r.output).join('\n'),
            filesModified: results.flatMap(r => r.filesModified),
        };
    }

    private handleExecutionError(error: any, context: TaskContext): TaskExecutionResult {
        return {
            taskId: context.clientId,
            status: 'failed',
            output: '',
            filesModified: [],
            errors: [error.message],
        };
    }
}