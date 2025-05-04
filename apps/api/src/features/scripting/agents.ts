import { SafeExecute } from "@/packages/utils/dist";
import { promptLLM } from './dir';
import { Logger } from "@/packages/utils/dist/logger/logger";
import { $ } from "bun";
import { ActionData, ChatData, Message } from "./intrefaces/agents";
import { extractJsonFromString } from "./validation";










const scriptRunner = async (command: string): Promise<string | null> => {
    $.cwd(cloneRepoDirectory || "");
    $.env({ ...process.env });
    let nm = command.split(" ");
    const fmnm = [...nm];

    const { stdout, stderr, exitCode } = await $`${fmnm}`.nothrow().quiet();
    if (exitCode !== 0) {
        Logger.logWarn(`Exit code: ${exitCode} `);
    }

    if (stderr.length > 0) {
        console.log(`${stderr} `);
    }
    if (stdout.length > 0) {
        const output = stdout !== null ? `${stdout} ` : null;
        if (output === null) {
            return null;
        }
        return `${output} `;
    }
    return null;
}




let inMemoryStepByStepGuideToFollowForTaskCompletion: string = "";

let tryCount = 0;
const chatHistory: ChatData[] | null = [];

let cloneRepoDirectory: string | null = null;






const fileAgent = async (input: string): Promise<string | null> => {
    const extractedJson = extractJsonFromString(input);
    if (extractedJson === null) {
        console.log("The LLM didn't return a valid JSON");
        return null;
    }
    if (extractedJson.includes("shell_command")) {
        const parsedLlmAnswer: ActionData = JSON.parse(extractedJson);
        console.dir(parsedLlmAnswer, { depth: Infinity, colors: true });


        chatHistory.push({
            question: <Message>{
                content: input,
                sender: "server",
            },
            answer: <Message>{
                content: JSON.stringify(parsedLlmAnswer),
                sender: "AI",
            },
        });

        const command = parsedLlmAnswer.shell_command;
        if (cloneRepoDirectory === null) {
            return null;
        }

        const output = await scriptRunner(command)
        console.log(output);



        if (output === null) {
            console.log(`Output: ${output}`);
            return null;
        }

        if (output) {
            const newPrompt = `Project structure: ${'projectStructure'}`
            return fileAgent(newPrompt);
        }
    }
    return null;
}
