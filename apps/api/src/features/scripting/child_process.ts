import { Logger, SafeExecute } from "@/packages/utils/dist";

// Interfaces
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
// /////////////////////////////////////////////


const controller = new AbortController();
const { signal } = controller;


const runCommand = async (command: string, workingDir: string, environmentVariables: any): Promise<string | null> => {
    const proc = Bun.spawnSync({
        cmd: command.split(" "),
        signal,
        cwd: workingDir,
        env: { ...environmentVariables },
    });
    const { stdout, stderr, success, exitedDueToTimeout, exitedDueToMaxBuffer, exitCode } = proc;



    if (stderr.length > 0) {
        console.log(`stderr: ${stderr}`);
        return null;
    }
    if (exitedDueToTimeout) {
        console.log("Process exited due to timeout");
        return null;
    }
    if (exitedDueToMaxBuffer) {
        console.log("Process exited due to max buffer size exceeded");
        return null;

    }
    if (stdout.length > 0) {
        console.log(`stdout: ${stdout}`);
        return `${stdout}`;
    }
    if (success) {
        console.log(`Command executed successfully with exit code: ${exitCode}, command: ${command}`);
        return null;
    }
    console.log(`Command failed with exit code: ${exitCode}`);
    return null;


    // Later, to abort the process:
    // controller.abort();
}


export const RunShellScript = {
    runCommand: runCommand,
} as const;





const proc = Bun.spawnSync(["bun", "--version"]);

console.log(proc.stdout.toString());
