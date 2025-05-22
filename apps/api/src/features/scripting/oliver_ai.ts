import { ActionData, AgentTask, FileToEdit, TerminatedTask, ShellAgentInstruction, TerminatedTaskSchema, ShellAgentInstructionSchema, FileToEditSchema, AgentTaskSchema } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_PLANER_AGENT_SHELL_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS, SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS, TASK_PLANNER_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS } from './agents_instructions';
import { SafeExecute } from '@/packages/utils/dist/errors/safe_execute';
import { ZodError, typeToFlattenedError } from 'zod';








const generateCodingTasks = async (input: string): Promise<null | AgentTask[]> => {

    try {

        const tasksPlanerAgentResponse = await LLM.agent<AgentTask[]>(input, TASK_PLANNER_AGENT_INSTRUCTIONS);

        if (tasksPlanerAgentResponse === null) {
            console.error("The LLM didn't return a valid JSON");
            return null;
        }


        return tasksPlanerAgentResponse;

    } catch (error: any) {
        console.error(error);
        return null;
    }
}



const buildAgent = async <T>(input: string, instructions: string): Promise<T | null> => {
    try {
        const tasksPlanerAgentResponse = await LLM.agent<T>(input, instructions);
        return tasksPlanerAgentResponse;
    } catch (error: any) {
        console.error(error);
        return null;
    }
}


const shellScriptingAgentRouter = async (input: string) => await buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);
const shellScriptingAgentFind = async (input: string) => await buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_FIND_INSTRUCTIONS);
const shellScriptingAgentCreate = async (input: string) => await buildAgent<ActionData>(input, SHELL_SCRIPT_AGENT_CREATE_INSTRUCTIONS);

export const shellScriptingAgent = {
    shellScriptingAgentRouter: shellScriptingAgentRouter,
    shellScriptingAgentFind: shellScriptingAgentFind,
    shellScriptingAgentCreate: shellScriptingAgentCreate,
} as const;

const codingAgent = async (input: string): Promise<string | null> => {
    try {
        const answer = await LLM.validateLlmResponse(input, CODING_AGENT_INSTRUCTIONS);

        if (answer === null) {

            console.error("Failed to validate LLM response.");

            return null;
        }

        const formattedData = extractJsonFromString(answer);

        if (formattedData === null) {
            return null;
        }

        // Check if the formatted data is a valid JSON string
        if (typeof formattedData !== "string") {
            return formattedData;
        }
        return null;
    } catch (error: any) {
        console.error(error);
        return null;
    }
}


const OliverAI = { shellScriptingAgent: shellScriptingAgent, codingAgent: codingAgent, generateCodingTasks: generateCodingTasks } as const;

export default OliverAI;
