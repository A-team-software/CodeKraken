import { SafeExecute } from "@/packages/utils/dist/errors/safe_execute";
import { ActionData, AgentTask, ChatData, Message } from "./intrefaces/agents";
import { extractJsonFromString } from "./validation";
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS } from './agents_instructions';


let inMemoryStepByStepGuideToFollowForTaskCompletion: string = "";

let tryCount = 0;
const chatHistory: ChatData[] | null = [];

let cloneRepoDirectory: string | null = null;




const generateTasks = async (input: string): Promise<AgentTask[] | null> => {

    const [answer, error] = await SafeExecute.withSync(LLM.prompt, input, TASK_AGENT_INSTRUCTIONS);

    if (error !== null) {
        console.error(error);
        return null;
    }

    if (answer === null) {
        console.error("Something went wrong on the LLM");
        return null;
    }

    if (answer.includes("error")) {
        console.dir(answer, { depth: Infinity, colors: true });
        return null;
    }

    const extractedJson = extractJsonFromString(input);

    if (extractedJson === null) {
        console.error(`Invalid JSON returned by the LLM: ${input}`);
        return null;
    }

    if (extractedJson.includes("task_number")) {
        const agentTasks: AgentTask[] = JSON.parse(extractedJson);
        if (JSON.stringify(agentTasks) !== JSON.stringify(extractedJson)) {
            console.error(`Invalid JSON returned by the LLM: ${input}`);
            return null;
        }

        console.dir(agentTasks, { depth: Infinity, colors: true });

        // Update chat history.
        chatHistory.push(<{ question: Message, answer: Message }>{
            question: {
                content: input || null,
                sender: "server",
            },
            answer: {
                content: JSON.stringify(agentTasks) || null,
                sender: "AI",
                AiAgentName: "Task planer"
            },
        });

        return agentTasks;
    }
    return null;
}

const TaskPlanerAgent = { generateTasks: generateTasks } as const;

export default TaskPlanerAgent;
