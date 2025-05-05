import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { $ } from "bun";
import { Logger, SafeExecute } from '@oliver/utils';
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS } from './agents_instructions';
import { extractJsonFromString } from './validation';
import { ChatData } from './interfaces/agents';
import TaskPlanerAgent from './oliver_ai';


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
    const result = await TaskPlanerAgent.generateTasks(input);
    console.dir(result, { depth: Infinity, colors: true });
}
main();
