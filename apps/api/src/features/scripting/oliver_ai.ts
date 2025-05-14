import { ActionData, AgentTask, FileToEdit, TerminatedTask, ShellAgentInstruction, TerminatedTaskSchema, ShellAgentInstructionSchema, FileToEditSchema, AgentTaskSchema } from './interfaces/agents';
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_PLANER_AGENT_SHELL_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS, SHELL_SCRIPT_AGENT_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS, TASK_PLANNER_AGENT_INSTRUCTIONS } from './agents_instructions';
import { SafeExecute } from '@/packages/utils/dist/errors/safe_execute';
import { ZodError, ZodObject, ZodRawShape, baseObjectOutputType, objectUtil, typeToFlattenedError } from 'zod';








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



const paresTask = (task: AgentTask) => {
    const [parseResult, parseError] = SafeExecute.noSync(AgentTaskSchema.parse, task);

    if (parseError instanceof ZodError) {
        const error: typeToFlattenedError<any, string> = parseError.flatten();
        console.error(`${JSON.stringify(error)}`);
        return null;
    }

    if (!(parseError instanceof ZodError) && (parseError != null)) {
        console.error(parseError);
        return null;

    }
    if (parseResult === null) {
        return null;
    }
    return task;
}

const evaluateTaskPlanerResponse = (taskPlanerAgentResponse: AgentTask[]) => {
    const tasks: AgentTask[] = [];
    for (let index = 0; index < taskPlanerAgentResponse.length; index++) {
        const unparsedTask = taskPlanerAgentResponse[index];
        const parsedTask = paresTask(unparsedTask);
        if (!(parsedTask)) break;
        tasks.push(parsedTask);
    }
    return tasks;
}

const promptTaskPlanerAgent = async (input: string, instructions: string): Promise<null | AgentTask[]> => {
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

    return taskPlanerAgentResponse;
}


const generateTasks = async (input: string, instructions: string): Promise<null | AgentTask[]> => {
    const [taskPlanerAgentResponse, taskPlanerError] = await SafeExecute.withSync(promptTaskPlanerAgent, input, instructions);
    if (taskPlanerError !== null) {
        console.error(taskPlanerError);
        return null;
    }
    if (taskPlanerAgentResponse) {
        const tasks = evaluateTaskPlanerResponse(taskPlanerAgentResponse);
        if (tasks.length === 0) {
            console.error("Failed to generate a list of tasks.");
        }
        return tasks;
    }
    return null;
}


const OliverAI = { generateTasks: generateTasks, shellScriptingAgent: shellScriptingAgent, codingAgent: codingAgent, generateCodingTasks: generateCodingTasks } as const;

export default OliverAI;
