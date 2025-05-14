import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { $ } from "bun";
import { Logger, SafeExecute } from '@oliver/utils';
import { AgentTask, TerminatedTask, FileToEdit, AgentShellLogs, TerminatedTaskSchema, ShellAgentInstruction, ShellAgentInstructionSchema, FileToEditSchema } from './interfaces/agents';

import OliverAI from './oliver_ai';
import ShellPrompt from './child_process';
import LLM from './ai';
import { SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS, CODING_AGENT_INSTRUCTIONS, TASK_PLANER_AGENT_SHELL_INSTRUCTIONS } from './agents_instructions';
import { ZodError } from 'zod';
import TaskPlaner from './task/task_agent';


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
    cloneRepoDirectory = path.join('/tmp', new Date().getTime().toString().concat(uuidv4().toString()));
    fs.mkdirSync(cloneRepoDirectory);
    // Clone the repository
    const git = simpleGit();
    try {
        await git.clone(repoUrl, cloneRepoDirectory);
        // await git.add('.');
        // await git.commit('your message');
        // await git.push();
        console.log("Repo cloned successfully");
    } catch (e: any) {
        console.error(e);
        return;
    }
    $.cwd(`${cloneRepoDirectory}/`);
    $.env({ ...process.env });
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
        console.error("Failed to generate project file tree");

        return null;
    }
    return projectFileTree;
}





const runShellScript = async (instruction: string): Promise<AgentShellLogs | null | string> => {
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
        return failedLog;
    }
    if (stderr !== null) {
        console.log(`stderr: ${JSON.stringify(stderr)} shellCommand: ${JSON.stringify(shellCommand.shell_command)}`);
    }

    if (error !== null) {
        console.error(`Error: ${error} `);
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





const main = async (): Promise<void> => {

    const [projectFileTree, projectError] = await SafeExecute.withSync(getProjectFileStructure)
    if ((projectError !== null) || (projectFileTree === null)) {
        projectError ? console.error(`Something went wrong while setting up the project: ${projectError} `) :
            null;
        return;
    }


    const assignment = `The Large Cards aren't responsive on some screens, there's a bottom over flow.Here is the project structure: ${projectFileTree} `;

    const [tasksList, taskError] = await SafeExecute.withSync(TaskPlaner.generateTasks, assignment, TASK_PLANER_AGENT_SHELL_INSTRUCTIONS, 0);

    if ((taskError !== null) || (tasksList === null)) {
        return;
    }



    let initialNumberOfTasks = tasksList.length;
    let isDone: boolean = initialNumberOfTasks === 0;

    const logs: AgentShellLogs[] = [];

    let currentTask
    // = tasksList.shift();

    var tryCount = 0;

    while (isDone === false) {
        if (tasksList) {
            console.log(tasksList);
            return;
        }
        let [routerResponse, routerError] = await SafeExecute.withSync(LLM.agent, `Main task: ${JSON.stringify(currentTask)}, Logs: ${JSON.stringify(logs)}`, SHELL_SCRIPT_AND_CODING_AGENTS_ROUTER_INSTRUCTIONS);

        if (!(routerResponse)) {
            return;
        }

        if (routerError !== null) {
            console.error(`Something went wrong with the agent router: ${routerError} `);
            return;
        }

        const [terminatedTask, terminatedTaskError] = SafeExecute.noSync(TerminatedTaskSchema.parse, routerResponse);
        if (terminatedTaskError !== null) {
            console.error("Skipped terminatedTask.");
        }

        // if (terminatedTask !== null) {
        //     terminatedTask as TerminatedTask;
        //     currentTask = tasksList.shift();
        //     if (tasksList.length === 0) {
        //         console.log("All tasks finished");
        //         isDone = true;
        //         break;
        //     }

        //     console.log(`Logs: ${JSON.stringify(logs)} `);
        //     console.log(`number of task now: ${tasksList.length}, initial number of task: ${initialNumberOfTasks} `);
        //     console.log(terminatedTask);

        // }


        const [shellAgentInstruction, shellAgentInstructionError] = SafeExecute.noSync(ShellAgentInstructionSchema.parse, routerResponse);
        if (shellAgentInstructionError !== null) {
            console.error("Skipped shellAgentInstruction type.");
            // console.error(shellAgentInstructionError);

        }

        if (shellAgentInstruction !== null) {

            shellAgentInstruction as ShellAgentInstruction;
            const instruction = `${JSON.stringify(shellAgentInstruction)}`;
            const output = await runShellScript(instruction);
            if (output === null) {
                continue;
            }

            if ((typeof output === "string")) {
                console.error("The command failed")
                tryCount++;
                const log: AgentShellLogs = {
                    AgentInput: output,
                    shellOutput: JSON.stringify(shellAgentInstruction),
                }
                logs.push(log);
                continue;
            }

            logs.push(output);
        }

        // const [fileToEdit, parseFileToEditError] = SafeExecute.noSync(FileToEditSchema.parse, routerResponse);
        let filesToEdit = routerResponse as FileToEdit[];
        const file = filesToEdit[0];
        if (!(filesToEdit[0])) {
            console.log("Skipped fileToEdit type.");
            continue;
        }
        if (filesToEdit[0] !== null) {
            // console.log(`currentTask: ${JSON.stringify(currentTask)}`);
            console.log(`filesToEdit: ${JSON.stringify(filesToEdit)}`);
            // console.log("Editing file...");
            const res = await LLM.agent(`Main task you need to solve: ${JSON.stringify(currentTask)}, File to edit: ${JSON.stringify(filesToEdit[0])}`, `${CODING_AGENT_INSTRUCTIONS}`)
            console.log(`Codding result: ${JSON.stringify(res)}`);
            isDone = true;
            return;
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

