import { execa } from "execa";

export async function runDocker(
    args: string[],
    options: { timeout?: number; env?: Record<string, string> } = {}
) {
    return execa("docker", args, {
        timeout: options.timeout,
        env: options.env,
        reject: false,
    });
}
