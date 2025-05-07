import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { $ } from "bun";
import { Logger, SafeExecute } from '@oliver/utils';
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS } from './agents_instructions';
import { extractJsonFromString } from './validation';
import { ChatData, AgentShellLogs, AgentTask, TerminatedTask, FileToEdit } from './interfaces/agents';
import TaskPlanerAgent from './oliver_ai';
import OliverAI from './oliver_ai';
import ShellPrompt from './child_process';


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






var inMemoryStepByStepGuideToFollowForTaskCompletion: string = "";

var tryCount = 0;
var chatHistory: ChatData[] | null = [];



const main = async () => {
    const [_, error] = await SafeExecute.withSync(gitOp, "https://github.com/ANORAK-MATTFLY/habit_master");

    if (error !== null) return;

    const [output, err] = await SafeExecute.withSync(scanProjectStructure);

    if (err !== null) return;

    if (output === null) {
        console.log("Failed to scan the project structure");
        return;
    }
    let inMemoryStepByStepGuideToFollowForTaskCompletion: AgentTask[] = [];

    const input = `The Large Cards aren't responsive on some screens, there's a bottom over flow.Here is the project structure: ${output} `;
    const tasksPlanerAgentResponse = await OliverAI.generateTasks(input);
    if (tasksPlanerAgentResponse instanceof Error) {
        console.error(tasksPlanerAgentResponse);
        return;
    }
    if (tasksPlanerAgentResponse === null) {
        console.error("The LLM didn't return a valid JSON");
        return;
    }
    inMemoryStepByStepGuideToFollowForTaskCompletion = tasksPlanerAgentResponse;
    let isDone = inMemoryStepByStepGuideToFollowForTaskCompletion.length === 0;

    const logs: AgentShellLogs[] = [];
    let currentTask = inMemoryStepByStepGuideToFollowForTaskCompletion.shift();
    while (isDone === false) {
        const [routerResponse, routerError] = await SafeExecute.withSync(OliverAI.agentRouter, `Main task: ${JSON.stringify(currentTask)}, Logs: ${JSON.stringify(logs)} `);
        if (routerResponse === null) {
            console.error(`Something went wrong with the agent router: ${routerResponse} `);
            return;
        }
        if (routerError !== null) {
            console.error(`Something went wrong with the agent router: ${routerError} `);
            return;
        }

        if (typeof routerResponse === "string") {
            const [shellCommand, shellCommandError] = await SafeExecute.withSync(OliverAI.shellScriptingAgent, routerResponse);

            if (shellCommandError !== null) {
                console.error("The LLM didn't return a valid JSON");
                return;
            }

            if (shellCommand === null) {
                console.error("The LLM didn't return a valid JSON");
                return;
            }
            const { exitCode, stderr, stdout, error } = await ShellPrompt.runShellCommandInChild(shellCommand.shell_command, cloneRepoDirectory || "");
            if ((exitCode !== null) || (exitCode !== 0)) {
                console.log(`Exit code: ${exitCode}: command: ${shellCommand.shell_command}, : stderr: ${stderr?.message} `);
                // return;
            }
            if (stderr !== null) {
                console.log(`stderr: ${stderr} `);
            }

            if (error !== null) {
                console.error(`Error: ${error?.message} `);
            }

            if (stdout.length > 0) {

                logs.push(<AgentShellLogs>{
                    AgentInput: routerResponse,
                    shellOutput: stdout,
                });
            }

            console.log(logs);


        } else {
            currentTask = inMemoryStepByStepGuideToFollowForTaskCompletion.shift();
            isDone = true;
            console.log(`Logs: ${JSON.stringify(logs)} `);
            console.log(`tasksPlanerAgentResponse size: ${tasksPlanerAgentResponse.length}, inMemoryStepByStepGuideToFollowForTaskCompletion size: ${inMemoryStepByStepGuideToFollowForTaskCompletion.length} `);

            console.log(routerResponse);
        }

    }
}
main();





















// try {
//     const data = routerResponse as TerminatedTask;
//     if (data.finished) {
//         isDone = true;
//         console.log("Task finished");
//         inMemoryStepByStepGuideToFollowForTaskCompletion.shift()
//         console.log(data)
//         currentTask = inMemoryStepByStepGuideToFollowForTaskCompletion.shift();
//         if (currentTask === undefined) {
//             console.log("All tasks finished");
//             isDone = true;
//             break;
//         }
//         return;
//     }
// } catch (e) {
//     console.error(e);
//     return;
// }
// try {
//     const data = routerResponse as FileToEdit;
//     const dr = await OliverAI.agentRouter(`Main task: ${ JSON.stringify(currentTask) }, Logs: ${ JSON.stringify(logs) }, Coding agent latest response: ${ JSON.stringify(data) } `)
//     if (!dr) {
//         console.error("The LLM didn't return a valid JSON");
//         return;
//     }
// } catch (e) {
//     console.error(e);
//     return;
// }

