import { ActionData, AgentTask, FileToEdit, TerminatedTask, ShellAgentInstruction, TerminatedTaskSchema, ShellAgentInstructionSchema, FileToEditSchema, AgentTaskSchema } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS, TASK_PLANNER_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS } from './agents_instructions';










const generateCodingTasks = async (input: string) => await LLM.buildAgent<AgentTask[]>(input, TASK_PLANNER_AGENT_INSTRUCTIONS);

const OliverAI = {
    generateCodingTasks: generateCodingTasks
} as const;

export default OliverAI;
