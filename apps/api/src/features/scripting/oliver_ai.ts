import { ActionData, AgentTask, ChatData, FileToEdit, TerminatedTask } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS, SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS } from './agents_instructions';



let tryCount = 0;
const chatHistory: ChatData[] | null = [];

let cloneRepoDirectory: string | null = null;




const generateTasks = async (input: string): Promise<(Error | null) | AgentTask[]> => {

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
        return new Error(error);
    }
}

const agentRouter = async (input: string): Promise<(Error | null) | (TerminatedTask | FileToEdit | string)> => {
    const answer = await LLM.validateLlmResponse(input, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS);

    if (answer === null) {

        console.error("Failed to validate LLM response.");

        return null;
    }

    const formattedData = extractJsonFromString(answer);

    if (formattedData === null) {
        return answer;
    }

    // Check if the formatted data is a valid JSON string
    if (typeof formattedData !== "string") {
        console.error("The formatted data is not a valid JSON string.");
        return null;
    }
    try {
        // Parse the JSON string to an object
        const parsedAs: TerminatedTask = JSON.parse(formattedData);
        return parsedAs;
    } catch (error: any) {
        console.error(error);
    }
    try {
        // Parse the JSON string to an object
        const parsedAs: FileToEdit = JSON.parse(formattedData);
        return parsedAs;
    } catch (error: any) {
        console.error(error);
    }
    return formattedData;
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
