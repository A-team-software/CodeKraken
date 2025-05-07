
import { $ } from "bun";

interface ShellScriptResult {
    stdout: string | null;
    stderr: Error | null;
    exitCode: number;
    error?: Error;
}

/**
 * Executes a shell command in a child process and returns its output.
 * @param shellScript The shell command to execute (e.g., "ls -l | grep .txt").
 * @param cwd Optional current working directory for the command.
 * @returns A promise that resolves to an object containing stdout, stderr, and exitCode.
 */
async function executeShellScriptInChildProcess(
    shellScript: string,
    cwd: string,
): Promise<ShellScriptResult> {
    try {
        // We use 'sh -c' (or 'bash -c' if you need bash-specific features)
        // to execute the shellScript as a shell command.
        // This allows for pipes, wildcards, etc., to be interpreted by the shell.
        const proc = Bun.spawn({
            cmd: ["bash", "-c", shellScript], // You can use "bash" instead of "sh" if needed
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
        console.error(`Error spawning or managing child process for command "${shellScript}":`, error);
        return {
            stdout: null,
            stderr: error instanceof Error ? new Error(String(error)) : null,
            exitCode: 1, // Indicate failure to get a proper exit code
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}

const ShellPrompt = { executeShellScriptInChildProcess: executeShellScriptInChildProcess } as const;
// Export the function if you want to use it as a module
export default ShellPrompt;
