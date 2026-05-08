import { execa } from "execa";

export async function isCommandAvailable(command: string): Promise<boolean> {
    const result = await execa("sh", ["-lc", `command -v ${command}`], {
        reject: false,
        stdout: "pipe",
        stderr: "pipe"
    });

    return result.exitCode === 0;
}

export function restoreEnv(originalEnv: Record<string, string | undefined>): void {
    for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
            delete process.env[key];
            continue;
        }

        process.env[key] = value;
    }
}

export async function githubApiRequest(path: string, token: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`https://api.github.com${path}`, {
        ...options,
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            ...(options.headers as Record<string, string> ?? {})
        }
    });
}

export async function pollForGithubPR(
    owner: string,
    repo: string,
    branch: string,
    token: string,
    {
        maxAttempts = 10,
        intervalMs = 3000,
        excludePrNumbers = [],
        throwOnTimeout = false
    }: { maxAttempts?: number; intervalMs?: number; excludePrNumbers?: number[]; throwOnTimeout?: boolean } = {}
): Promise<{ number: number; html_url: string } | undefined> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await githubApiRequest(
            `/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(branch)}&state=open`,
            token
        );

        if (response.ok) {
            const prs = await response.json() as Array<{ number: number; html_url: string }>;
            const candidate = prs.find((pr) => !excludePrNumbers.includes(pr.number));
            if (candidate) {
                return candidate;
            }
        }

        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    if (throwOnTimeout) {
        throw new Error(`Timed out waiting for open PR on ${owner}/${repo} for branch '${branch}'.`);
    }

    return undefined;
}

export async function fetchGithubPRFiles(
    owner: string,
    repo: string,
    prNumber: number,
    token: string
): Promise<Array<{ filename: string; patch?: string }>> {
    const response = await githubApiRequest(`/repos/${owner}/${repo}/pulls/${prNumber}/files`, token);
    if (!response.ok) {
        throw new Error(`Failed to fetch PR files for #${prNumber}: HTTP ${response.status}`);
    }

    return response.json() as Promise<Array<{ filename: string; patch?: string }>>;
}

export async function getGithubPR(owner: string, repo: string, prNumber: number, token: string): Promise<{ title: string; body: string }> {
    const response = await githubApiRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
    if (!response.ok) {
        throw new Error(`Failed to fetch PR #${prNumber}: HTTP ${response.status}`);
    }

    const pr = await response.json() as { title?: string; body?: string | null };
    return {
        title: typeof pr.title === "string" && pr.title.trim().length > 0 ? pr.title : `PR ${prNumber}`,
        body: typeof pr.body === "string" ? pr.body : ""
    };
}

export async function mergeGithubPR(
    owner: string,
    repo: string,
    prNumber: number,
    token: string
): Promise<{ merged: boolean; message?: string }> {
    const response = await githubApiRequest(`/repos/${owner}/${repo}/pulls/${prNumber}/merge`, token, {
        method: "PUT",
        body: JSON.stringify({ merge_method: "merge" })
    });

    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Failed to merge PR #${prNumber}: HTTP ${response.status} ${bodyText}`);
    }

    return response.json() as Promise<{ merged: boolean; message?: string }>;
}

export async function closeOpenPRsForBranch(owner: string, repo: string, branch: string, token: string): Promise<void> {
    const response = await githubApiRequest(
        `/repos/${owner}/${repo}/pulls?head=${owner}:${encodeURIComponent(branch)}&state=open`,
        token
    );

    if (!response.ok) {
        throw new Error(`Failed to list open PRs for branch '${branch}': HTTP ${response.status}`);
    }

    const prs = await response.json() as Array<{ number: number }>;
    for (const pr of prs) {
        await closeGithubPR(owner, repo, pr.number, token);
    }
}

export async function closeGithubPR(owner: string, repo: string, prNumber: number, token: string): Promise<void> {
    await githubApiRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`, token, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed" })
    });
}

export async function deleteGithubBranch(owner: string, repo: string, branch: string, token: string): Promise<void> {
    await githubApiRequest(`/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, token, {
        method: "DELETE"
    });
}

export function parseGitHubRepoUrl(repoUrl: string): { owner: string; name: string } {
    const trimmed = repoUrl.trim();

    if (!trimmed) {
        throw new Error("Repository URL is empty.");
    }

    const normalized = trimmed.endsWith(".git") ? trimmed.slice(0, -4) : trimmed;

    const sshMatch = normalized.match(/^git@github\.com:([^/]+)\/([^/]+)\/?$/i);
    if (sshMatch) {
        return { owner: sshMatch[1], name: sshMatch[2] };
    }

    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        throw new Error(`Unable to parse GitHub repository URL '${repoUrl}'.`);
    }

    if (!/github\.com$/i.test(parsed.hostname)) {
        throw new Error(`Unsupported repository host '${parsed.hostname}'. Expected github.com.`);
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2) {
        throw new Error(`Unable to parse owner/repo from URL '${repoUrl}'.`);
    }

    return {
        owner: segments[0],
        name: segments[1]
    };
}
