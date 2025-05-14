import { ZodError, typeToFlattenedError } from 'zod';
import { AgentTask, AgentTaskSchema } from '../interfaces/agents';
import { SafeExecute } from '@oliver/utils';
import LLM from '../ai';
import { TaskPlaning } from './interfaces/task';


const zodSchemaParser = <T>(task: T, schemaParser: any) => {
    const [parseResult, parseError] = SafeExecute.noSync(schemaParser.parse, task);

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
        const parsedTask = zodSchemaParser(unparsedTask, AgentTaskSchema);
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


const pauseThread = async (duration: number) => {
    new Promise(() => {
        setTimeout(async () => {
        }, duration);
    });
}


const generateTasks = async (input: string, instructions: string, retry: number): Promise<null | AgentTask[]> => {

    if (retry >= 5) {
        return null;
    }

    const [taskPlanerAgentResponse, taskPlanerError] = await SafeExecute.withSync(promptTaskPlanerAgent, input, instructions);

    if (taskPlanerError !== null) {
        console.error(taskPlanerError);
        return null;
    }

    if (taskPlanerAgentResponse) {
        const tasks = evaluateTaskPlanerResponse(taskPlanerAgentResponse);
        if (tasks.length === 0) {
            console.error("Failed to generate a list of tasks.");
            const minutes = 1000 * 60 * 5 // 5 minutes;
            await pauseThread(minutes);
            await generateTasks(input, instructions, retry + 1);
        };
        return tasks;
    }
    return null;
}


const TaskPlaner: TaskPlaning = {
    zodSchemaParser: zodSchemaParser,
    evaluateTaskPlanerResponse: evaluateTaskPlanerResponse,
    generateTasks: generateTasks,
    promptTaskPlanerAgent: promptTaskPlanerAgent
} as const;

export default TaskPlaner;
