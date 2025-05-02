import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { $ } from "bun";
import { Logger, SafeExecute } from '@oliver/utils';
import { promptLLM } from './dir';


let projectStructure: string | null;
let cloneRepoDirectory: string | null = null;




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

const scanProjectStructure = async (): Promise<string | null> => {
    const { stdout, stderr, exitCode } = await $`ls -lR ${cloneRepoDirectory} `.nothrow().quiet();
    if (exitCode !== 0) {
        Logger.logWarn(`Exit code: ${exitCode} `);
        return null;
    }

    if (stderr.length > 0) {
        console.log(`${stderr} `);
        return null;
    }
    if (stdout.length > 0) {
        projectStructure = stdout !== null ? `${stdout}` : null;
        return projectStructure;
    }
    return null;
}



const prompt = async (input: string): Promise<any | null> => {
    const [llmResponse, error] = await SafeExecute.withSync(promptLLM, input);

    if (error !== null) {
        console.log(error);
        return null;
    }
    if (!(llmResponse)) {
        console.log(`res: ${llmResponse} `);
        return null;
    }
    // const proc = Bun.spawn(["bun", "--version"], {
    //   cwd: "./path/to/subdir", // specify a working directory
    //   env: { ...process.env, FOO: "bar" }, // specify environment variables
    //   onExit(proc, exitCode, signalCode, error) {
    //     // exit handler
    //   },
    // });

    // proc.pid; // process ID of subprocess
    if (llmResponse["candidates"] === undefined) {
        console.dir(llmResponse, { depth: Infinity, colors: true });
        return null;
    }
    const answer = llmResponse["candidates"][0]["content"]["parts"][0]["text"];
    console.dir(answer, { depth: Infinity, colors: true });
    if (!answer) {
        console.dir(answer, { depth: Infinity, colors: true });
        return null;
    }

    return answer;
}


const gitOp = async (repoUrl: string) => {
    try {
        cloneRepoDirectory = path.join('/tmp', new Date().getTime().toString().concat(uuidv4().toString()));
        fs.mkdirSync(cloneRepoDirectory);
        // Clone the repository
        const git = simpleGit();
        await git.clone(repoUrl, cloneRepoDirectory);
        // await git.add('.');
        // await git.commit('your message');
        // await git.push();
        $.cwd(`${cloneRepoDirectory}/`);
        $.env({ ...process.env });
        console.log("Repo cloned successfully");
    } catch (e: any) {
        console.log(e);
    }
}

type Message = {
    content: string | null,
    sender: string,
}

type ChatData = {
    question: Message | null,
    answer: Message | null,
}

interface ActionData {
    action_name: string;
    shell_command: string;
}



// 3. Function to extract JSON from potential markdown code blocks
function extractJsonFromString(str: string): string | null {
    const jsonRegex = /\s*```json\s*([\s\S]*?)\s*```\s*/;

    const match = str.match(jsonRegex);

    // If a match is found, the captured JSON string is in match[1]
    if (match && match[1]) {
        return match[1].trim(); // Trim any leading/trailing whitespace from the extracted JSON itself
    }

    // Fallback: Maybe it's just raw JSON without markers?
    // Basic check: Does it seem to start with { and end with } after trimming?
    const trimmedStr = str.trim();
    if (trimmedStr.startsWith('{') && trimmedStr.endsWith('}')) {
        return trimmedStr;
    }

    return null;
}






let inMemoryStepByStepGuideToFollowForTaskCompletion: string = "";

let tryCount = 0;
const chatHistory: ChatData[] | null = [];
const runAgent = async (input: string): Promise<void> => {
    if (!cloneRepoDirectory) {
        console.log("Failed to clone the repo");
        return;
    }
    if (tryCount > 30) {
        console.log("The LLM is stuck, please try again");
        return;
    }
    tryCount++;
    const [answer, error] = await SafeExecute.withSync(prompt, input);
    if (error !== null) {
        console.log(error);
        return;
    }
    if (answer === null) {
        console.log("Something went wrong on the LLM");
        return;
    }
    const extractedJson = extractJsonFromString(answer);
    if (extractedJson === null) {
        console.log("The LLM didn't return a valid JSON");
        return;
    }
    if (extractedJson.includes("finished")) {
        tryCount = 31;
        return;
    }
    if (extractedJson.includes("steps")) {
        inMemoryStepByStepGuideToFollowForTaskCompletion = JSON.stringify(extractedJson)
        const newPrompt = `Project structure: ${projectStructure}, Chat history: ${JSON.stringify(chatHistory)}, step-by-step guide: ${inMemoryStepByStepGuideToFollowForTaskCompletion}`
        return runAgent(newPrompt);
    }
    if (extractedJson.includes("content")) {
        tryCount = 31;
        return;
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
            return;
        }
        const output = await scriptRunner(command)
        console.log(output);
        if (error !== null) {
            console.log(error);
            return;
        }
        if (output === null) {
            console.log(`Output: ${output}`);
            return;
        }

        if (output) {
            const newPrompt = `Project structure: ${projectStructure}, Chat history: ${JSON.stringify(chatHistory)}, step-by-step guide: ${inMemoryStepByStepGuideToFollowForTaskCompletion}`
            // console.log(`${newPrompt}`);
            return runAgent(newPrompt);
        }
    }
}



const main = async () => {
    const [_, error] = await SafeExecute.withSync(gitOp, "https://github.com/ANORAK-MATTFLY/habit_master");
    if (error !== null) return;
    const [output, err] = await SafeExecute.withSync(scanProjectStructure);
    if (err !== null) return;
    if (output === null) {
        console.log("Failed to scan the project structure");
        return;
    }
    const input = `The Large Cards aren't responsive on some screens, there's a bottom over flow. Here is the project structure: ${output}`;
    const [answer, er] = await SafeExecute.withSync(prompt, input);
    if (er !== null) {
        Logger.logError(er);
    }
    if (!answer) {
        console.log("Something went wrong on the LLM");
        return;
    }
    runAgent(answer);
}
main();
