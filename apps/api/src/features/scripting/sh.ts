import simpleGit from 'simple-git';
import { v4 as uuidv4 } from 'uuid';

import path from 'path';
import fs from 'fs';
import { Stream } from "stream";
import { $ } from "bun";
import { Logger } from '@oliver/utils';





const gitOp = async (repoUrl: string) => {
    try {
        const projectDir = path.join('/tmp', new Date().getTime().toString());
        fs.mkdirSync(projectDir);
        // Clone the repository
        const git = simpleGit();
        try {
            const res = await git.clone(repoUrl, projectDir);
            console.log(`Dir: ${projectDir}`);
            console.log(`Clone result: ${res}`);
        } catch (e: any) {
            Logger.logError(e);
        }
        await git.add('.');
        await git.commit('your message');
        await git.push();
    } catch (e: any) {
        Logger.logError(e);
    }
}

gitOp("https://github.com/ANORAK-MATTFLY/habit_master");





const main = async () => {
    const initializeAnoCode = async () => {
        const { stdout, stderr, exitCode } = await $`pip install ano-code==8.0.18`.nothrow().quiet();
        if (exitCode !== 0) {
            console.log(exitCode);
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
        }
        if (stdout) {
            console.log(`${stdout}`);
        }
    }

    const scanProject = async () => {
        const { stdout, stderr, exitCode } = await $`ano-code scan-project ../../../`.nothrow().quiet()
        if (exitCode !== 0) {
            console.log(exitCode);
        }
        if (stderr.length > 0) {
            console.log(`stderr: ${stderr}`);
        }
        if (stdout) {
            console.log(`${stdout}`);
        }
    };
    await initializeAnoCode();
    await scanProject();
}
// main();
