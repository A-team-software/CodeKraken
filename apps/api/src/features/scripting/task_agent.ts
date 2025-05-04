import { SafeExecute } from "@/packages/utils/dist/errors/safe_execute";
import { ActionData, AgentTask, ChatData, Message } from "./interfaces/agents";
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS } from './agents_instructions';


let inMemoryStepByStepGuideToFollowForTaskCompletion: string = "";

let tryCount = 0;
const chatHistory: ChatData[] | null = [];

let cloneRepoDirectory: string | null = null;




const generateTasks = async (input: string): Promise<AgentTask[] | null> => {

    try {
        const tasksAgentResponse = await LLM.agent<AgentTask[]>(input, TASK_AGENT_INSTRUCTIONS);
        if (tasksAgentResponse === null) {
            console.error("Something went wrong on the LLM");
            return null;
        }
        return tasksAgentResponse;
    } catch (error: any) {
        console.error(error);
        return null;
    }
}

const TaskPlanerAgent = { generateTasks: generateTasks } as const;

export default TaskPlanerAgent;
