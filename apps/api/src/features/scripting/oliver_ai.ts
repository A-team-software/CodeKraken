import { ActionData, AgentTask, FileToEdit, TerminatedTask, ShellAgentInstruction, TerminatedTaskSchema, ShellAgentInstructionSchema, FileToEditSchema, AgentTaskSchema } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_PLANER_AGENT_SHELL_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS, SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS, TASK_PLANNER_AGENT_INSTRUCTIONS } from './agents_instructions';
import { SafeExecute } from '@/packages/utils/dist/errors/safe_execute';
import { ZodError, ZodObject, ZodRawShape, baseObjectOutputType, objectUtil, typeToFlattenedError } from 'zod';






const generateTasks = async (input: string): Promise<null | AgentTask[]> => {

    try {

        const tasksPlanerAgentResponse = await LLM.agent<AgentTask[]>(input, TASK_PLANER_AGENT_SHELL_INSTRUCTIONS);

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

const parser = async <T extends ZodRawShape>(llmAnswer: any): Promise<{ [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T>, any>[k]; } | null> => {
    let zData: ZodObject<T> = llmAnswer;

    const [parsedData, parseError] = SafeExecute.noSync(zData.parse, llmAnswer);
    if (parseError !== null) {
        console.error(parseError);
        return null;
    }
    if (parsedData) {
        return parsedData;
    }
    return null
}

const createListOfTasks = async (input: string, instructions: string): Promise<null | AgentTask[]> => {
    let taskPlanerAgentResponse = undefined;
    try {
        taskPlanerAgentResponse = await LLM.agent<AgentTask[]>(input, instructions);
        if (taskPlanerAgentResponse === null) {
            return null;
        }
        if (taskPlanerAgentResponse === undefined) {
            return null;
        }
    } catch (error: any) {
        console.error(error);
        return null;
    }
    const tasks: AgentTask[] = [];
    for (let index = 0; index < taskPlanerAgentResponse.length; index++) {
        const task = taskPlanerAgentResponse[index];
        const [parseResult, parseError] = SafeExecute.noSync(AgentTaskSchema.parse, task);
        if (parseError instanceof ZodError) {
            const error: typeToFlattenedError<any, string> = parseError.flatten();
            console.error(`${JSON.stringify(error)}`);
            break;
        }
        if (!(parseError instanceof ZodError) && (parseError != null)) {
            console.error(parseError);
            break;

        }
        if (parseResult === null) {
            break;
        }
        tasks.push(parseResult);
    }
    if (tasks.length === 0) {
        console.error("Failed to generate a list of tasks.");
        return null;
    }

    return tasks;
}



const OliverAI = { createListOfTasks: createListOfTasks, generateTasks: generateTasks, shellScriptingAgent: shellScriptingAgent, codingAgent: codingAgent, generateCodingTasks: generateCodingTasks } as const;

export default OliverAI;
