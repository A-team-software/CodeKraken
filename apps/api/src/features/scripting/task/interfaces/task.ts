import { AgentTask } from '../../interfaces/agents';

export type TaskPlaning = {
    zodSchemaParser: <T>(task: T, schemaParser: any) => T | null
    evaluateTaskPlanerResponse: (taskPlanerAgentResponse: AgentTask[]) => AgentTask[];
    generateTasks: (input: string, instructions: string, retry: number) => Promise<null | AgentTask[]>;
    promptTaskPlanerAgent: (input: string, instructions: string) => Promise<null | AgentTask[]>;
}
