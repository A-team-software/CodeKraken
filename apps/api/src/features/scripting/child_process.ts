// run-shell-command.ts

import { $ } from "bun";

interface ShellCommandResult {
    stdout: string;
    stderr: Error | null;
    exitCode: number | null; // null if the process couldn't be started or exited abnormally
    error?: Error; // Optional error object if Bun.spawn itself failed
}

/**
 * Executes a shell command in a child process and returns its output.
 * @param commandString The shell command to execute (e.g., "ls -l | grep .txt").
 * @param cwd Optional current working directory for the command.
 * @param env Optional environment variables for the command.
 * @returns A promise that resolves to an object containing stdout, stderr, and exitCode.
 */
async function runShellCommandInChild(
    commandString: string,
    cwd?: string,
    env?: Record<string, string>
): Promise<ShellCommandResult> {
    try {
        // We use 'sh -c' (or 'bash -c' if you need bash-specific features)
        // to execute the commandString as a shell command.
        // This allows for pipes, wildcards, etc., to be interpreted by the shell.
        const proc = Bun.spawn({
            cmd: ["bash", "-c", commandString], // You can use "bash" instead of "sh" if needed
            stdout: "pipe", // Capture stdout
            stderr: "pipe", // Capture stderr
            stdin: "inherit", // Inherit stdin from parent, or use "pipe" / "null"
            cwd: cwd, // Set current working directory if provided
            env: {
                ...process.env, // Inherit parent's environment
                // ...env, // Override with custom env vars if provided
            },
        });

        // Read stdout and stderr streams to text
        // These promises will resolve when the respective streams close.
        const stdoutPromise = Bun.readableStreamToText(proc.stdout);
        const stderrPromise = Bun.readableStreamToText(proc.stderr);

        // Wait for the process to exit and get the exit code
        const exitCode = await proc.exited;

        // Wait for stream reading to complete
        const [stdout, stderr] = await Promise.all([
            stdoutPromise,
            stderrPromise,
        ]);

        return {
            stdout: stdout.trim(),
            stderr: new Error(String(stderr)),
            exitCode: exitCode,
        };
    } catch (error) {
        // This catch block handles errors from Bun.spawn itself (e.g., if 'sh' is not found)
        // or other unexpected issues during the spawning/setup process.
        console.error(`Error spawning or managing child process for command "${commandString}":`, error);
        return {
            stdout: "",
            stderr: error instanceof Error ? new Error(String(error)) : null,
            exitCode: null, // Indicate failure to get a proper exit code
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}

// --- Example Usage ---
async function main() {
    console.log("Running a simple echo command...");
    const echoResult = await runShellCommandInChild('echo "Hello from child process!"');
    console.log("Echo Result:", echoResult);
    /*
    Expected Echo Result:
    {
      stdout: 'Hello from child process!',
      stderr: '',
      exitCode: 0
    }
    */

    console.log("\nRunning a command with a pipe...");
    const pipeResult = await runShellCommandInChild("ls -la | grep 'run-shell' | awk '{print $9}'");
    console.log("Pipe Result:", pipeResult);
    /*
    Expected Pipe Result (will show 'run-shell-command.ts' or similar if in current dir):
    {
      stdout: 'run-shell-command.ts', // or similar, depending on ls output format and presence of the file
      stderr: '',
      exitCode: 0
    }
    */


    console.log("\nRunning a command that produces stderr and a non-zero exit code...");
    const errorResult = await runShellCommandInChild("ls /nonexistent_directory_12345");
    console.log("Error Command Result:", errorResult);
    /*
    Expected Error Command Result (stderr message may vary by OS/shell):
    {
      stdout: '',
      stderr: 'ls: cannot access \'/nonexistent_directory_12345\': No such file or directory', // or similar
      exitCode: 1 // or 2, etc. depending on `ls` implementation
    }
    */

    console.log("\nRunning a command in a different CWD (if /tmp exists and is writable)...");
    // Note: Creating a temporary file to list
    await Bun.write("/tmp/bun_child_process_test_file.txt", "Test content");
    const cwdResult = await runShellCommandInChild("ls bun_child_process_test_file.txt", "/tmp");
    console.log("CWD Command Result:", cwdResult);
    /*
    Expected CWD Command Result:
    {
      stdout: 'bun_child_process_test_file.txt',
      stderr: '',
      exitCode: 0
    }
    */
    // Cleanup temp file
    await $`rm /tmp/bun_child_process_test_file.txt`.nothrow();


    console.log("\nTrying to run a command that might fail to spawn (e.g., shell not found - unlikely for 'sh')...");
    // To truly test this, you might try a command that doesn't exist on your PATH
    // Forcing an error in Bun.spawn itself is harder if 'sh' is present.
    // Let's simulate by trying an invalid command within the spawn options, though 'sh -c' usually handles this
    // by 'sh' returning an error, not Bun.spawn throwing.
    // A more direct way to test Bun.spawn failure would be:
    // const failedSpawn = Bun.spawn({ cmd: ["absolutely_non_existent_command_gfdgdfg"] });
    // For this example, let's stick to the function's design.
    // An empty command string to sh -c usually results in exit code 0 and no output.
    const emptyCommandResult = await runShellCommandInChild("");
    console.log("Empty Command Result:", emptyCommandResult);
}



const ShellPrompt = { runShellCommandInChild: runShellCommandInChild } as const;
// Export the function if you want to use it as a module
export default ShellPrompt;
