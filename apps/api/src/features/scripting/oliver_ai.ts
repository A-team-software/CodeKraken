import { SafeExecute } from "@/packages/utils/dist/errors/safe_execute";
import { ActionData, AgentTask, ChatData, Message } from "./interfaces/agents";
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS } from './agents_instructions';


let inMemoryStepByStepGuideToFollowForTaskCompletion: AgentTask[] = [];

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

        inMemoryStepByStepGuideToFollowForTaskCompletion = tasksPlanerAgentResponse;

        return tasksPlanerAgentResponse;

    } catch (error: any) {
        console.error(error);
        return new Error(error);
    }
}

const agentRouter = async (input: string): Promise<(Error | null) | AgentTask[]> => {
    try {

        const agentRouterResponse = await LLM.agent<AgentTask[]>(input, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS);

        if (agentRouterResponse instanceof Error) {
            console.error(`${agentRouterResponse}`);
            return agentRouterResponse;
        }

        if (agentRouterResponse === null) {
            console.error("The LLM didn't return a valid JSON");
            return null;
        }


        return agentRouterResponse;

    } catch (error: any) {
        console.error(error);
        return new Error(error);
    }
}



const TaskPlanerAgent = { generateTasks: generateTasks } as const;

export default TaskPlanerAgent;
