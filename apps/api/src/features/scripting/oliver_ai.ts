import { ActionData, AgentTask, FileToEdit, TerminatedTask, ShellAgentInstruction, TerminatedTaskSchema, ShellAgentInstructionSchema, FileToEditSchema } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS, SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS } from './agents_instructions';
import { SafeExecute } from '@/packages/utils/dist/errors/safe_execute';
import { ZodError, typeToFlattenedError } from 'zod';






const generateTasks = async (input: string): Promise<null | AgentTask[]> => {

    try {

        const tasksPlanerAgentResponse = await LLM.agent<AgentTask[]>(input, TASK_AGENT_INSTRUCTIONS);

        if (tasksPlanerAgentResponse instanceof Error) {
            console.error("Something went wrong on the LLM");
            return tasksPlanerAgentResponse;
        }

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

const agentRouter = async (input: string): Promise<null | (TerminatedTask | FileToEdit | ShellAgentInstruction)> => {
    const answer = await LLM.validateLlmResponse(input, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS);

    if (answer === null) {

        return null;
    }

    const formattedData = extractJsonFromString(answer);

    if (formattedData === null) {
        console.log(`LLM answer: ${answer}`);
        return null;
    }


    const [terminatedTask, parseTaskError] = SafeExecute.noSync(TerminatedTaskSchema.parse, formattedData);
    if (parseTaskError instanceof ZodError) {
        console.error(parseTaskError.flatten());
        return null;
    }
    if (terminatedTask !== null) {
        return terminatedTask as TerminatedTask;
    }


    const [shellAgentInstruction, parseShellAgentInstructionError] = SafeExecute.noSync(ShellAgentInstructionSchema.parse, formattedData);
    if (parseShellAgentInstructionError instanceof ZodError) {
        console.error(parseShellAgentInstructionError.flatten());
        return null;
    }
    if (shellAgentInstruction !== null) {
        return shellAgentInstruction as ShellAgentInstruction;
    }

    const [fileToEdit, parseFileToEditError] = SafeExecute.noSync(FileToEditSchema.parse, formattedData);
    if (parseFileToEditError instanceof ZodError) {
        console.error(parseFileToEditError.flatten());
        return null;
    }
    if (fileToEdit !== null) {
        return fileToEdit as FileToEdit;
    }

    return null;
}

const shellScriptingAgent = async (input: string): Promise<ActionData | null> => {
    try {

        const tasksPlanerAgentResponse = await LLM.agent<ActionData>(input, SHELL_SCRIPT_AGENT_INSTRUCTIONS);



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



const OliverAI = { generateTasks: generateTasks, agentRouter: agentRouter, shellScriptingAgent: shellScriptingAgent, codingAgent: codingAgent } as const;

export default OliverAI;
