import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { $ } from "bun";
import { Logger, SafeExecute } from '@oliver/utils';
import LLM from './ai';
import { TASK_AGENT_INSTRUCTIONS, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS } from './agents_instructions';
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
        Logger.logWarn(`Exit code: ${exitCode}, stderr: ${stderr} `);
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



const getProjectFileStructure = async (): Promise<string | null> => {
    const [_, gitCloneError] = await SafeExecute.withSync(gitOp, "https://github.com/ANORAK-MATTFLY/habit_master");

    if (gitCloneError !== null) {
        console.error(`Something went wrong with the git clone: ${gitCloneError} `);
        return null;
    };

    const [projectFileTree, projectScanError] = await SafeExecute.withSync(scanProjectStructure);

    if (projectScanError !== null) {
        console.error(`Something went wrong while scanning the project: ${projectScanError} `);
        return null;
    };

    if (projectFileTree === null) {
        console.error("Failed to scan the project structure");
        return null;
    }
    return projectFileTree;
}


const createTasks = async (input: string): Promise<null | AgentTask[]> => {

    const [tasksPlanerAgentResponse, taskGenerationError] = await SafeExecute.withSync(OliverAI.generateTasks, input);

    if ((taskGenerationError !== null)) {
        taskGenerationError ? console.error("Something went wrong while generating the tasks: ", taskGenerationError)
            : console.error(tasksPlanerAgentResponse);
    }
    return tasksPlanerAgentResponse;
}


const runShellScript = async (instruction: string): Promise<AgentShellLogs | null | number> => {
    const [shellCommand, shellCommandError] = await SafeExecute.withSync(OliverAI.shellScriptingAgent, instruction);

    if (shellCommandError !== null) {
        console.error("The LLM didn't return a valid JSON");
        return null;
    }

    if (shellCommand === null) {
        console.error("The LLM didn't return a valid JSON");
        return null;
    }
    const { exitCode, stderr, stdout, error } = await ShellPrompt.executeShellScriptInChildProcess(shellCommand.shell_command, cloneRepoDirectory || "");
    let failedLog: string | null = null;
    if (exitCode !== 0) {
        failedLog = `Exit code: ${exitCode}, command: ${shellCommand.shell_command}, : stderr: ${stderr?.message}`;
        console.log(`Exit code: ${exitCode}, command: ${shellCommand.shell_command}, : stderr: ${stderr?.message}`);
        return 2;
    }
    if (stderr !== null) {
        console.log(`stderr: ${stderr} `);
    }

    if (error !== null) {
        console.error(`Error: ${error?.message} `);
    }

    if (stdout !== null) {
        const log = <AgentShellLogs>{
            AgentInput: failedLog ? failedLog : shellCommand.shell_command,
            shellOutput: stdout,
        };
        return log;
    }

    return null;
}


var chatHistory: ChatData[] | null = [];



let inMemoryStepByStepGuideToFollowForTaskCompletion: AgentTask[] = [];
const main = async (): Promise<void> => {

    const [projectFileTree, projectError] = await SafeExecute.withSync(getProjectFileStructure)
    if ((projectError !== null) || (projectFileTree === null)) {
        console.error(`Something went wrong while setting up the project: ${projectError} `);
        return;
    }


    const assignment = `The Large Cards aren't responsive on some screens, there's a bottom over flow.Here is the project structure: ${projectFileTree} `;

    const [tasksList, taskError] = await SafeExecute.withSync(createTasks, assignment);

    if ((taskError !== null) || (tasksList === null)) {
        return;
    }


    inMemoryStepByStepGuideToFollowForTaskCompletion = tasksList;
    let initialNumberOfTasks = tasksList.length;
    let isDone: boolean = initialNumberOfTasks === 0;

    const logs: AgentShellLogs[] = [];

    let currentTask = tasksList.shift();

    var tryCount = 0;

    while (isDone === false) {
        let [routerResponse, routerError] = await SafeExecute.withSync(OliverAI.agentRouter, `Main task: ${JSON.stringify(currentTask)}, Logs: ${JSON.stringify(logs)} `);
        if (routerResponse === null) {
            return;
        }
        if (routerError !== null) {
            console.error(`Something went wrong with the agent router: ${routerError} `);
            return;
        }


        if (typeof routerResponse === "string") {

            const output = await runShellScript(routerResponse);

            if (output === null) {
                return;
            }

            if ((typeof output === "number")) {
                console.error("The command failed")
                tryCount++;
                continue;
            }

            logs.push(output);

        } else if (Array.isArray(routerResponse)) {
            console.dir(routerResponse, { depth: Infinity, colors: true });
            isDone = true;
            break;
        } else {
            currentTask = tasksList.shift();
            if (tasksList.length === 0) {
                console.log("All tasks finished");
                isDone = true;
                break;
            }


            console.log(`Logs: ${JSON.stringify(logs)} `);
            console.log(`number of task now: ${tasksList.length}, initial number of task: ${initialNumberOfTasks} `);
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

