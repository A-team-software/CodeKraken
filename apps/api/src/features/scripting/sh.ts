import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { $ } from "bun";
import { Logger, SafeExecute } from '@oliver/utils';
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS } from './contants';
import { extractJsonFromString } from './validation';
import { ChatData } from './intrefaces/agents';


let projectStructure: string | null;
let cloneRepoDirectory: string | null = null;






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
    const [answer, error] = await SafeExecute.withSync(LLM.prompt, input, TASK_AGENT_INSTRUCTIONS);
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
}
main();
