import { runDocker } from "./run_docker";

function buildCloneUrl(raw: string, token?: string) {
    if (!token) return raw;

    try {
        const u = new URL(raw.replace(/\.git$/, ""));
        if (u.hostname !== "github.com") return raw;
        u.username = "x-access-token";
        u.password = token;
        return u.toString();
    } catch {
        return raw;
    }
}

export async function cloneRepo(repoUrl: string, githubToken?: string) {
    const cloneUrl = buildCloneUrl(repoUrl, githubToken);

    return runDocker(
        [
            "run",
            "--rm",
            "--cpus=1",
            "--memory=2g",
            "--pids-limit=128",
            "--cap-drop=ALL",
            "--security-opt=no-new-privileges",
            "opencode-sandbox",
            "sh",
            "-c",
            `
mkdir -p /workspace/repo && \
git clone ${cloneUrl} /workspace/repo
cd /workspace/repo
`,
        ],
        { timeout: 60_000 }
    );
}
