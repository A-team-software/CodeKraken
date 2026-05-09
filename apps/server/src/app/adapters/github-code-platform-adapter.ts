import { PullRequestCommentPayload } from "@/app/services/pr/comment-payload-adapter";
import { PullRequestComment } from "@/types/pull-request-comment";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { CodePlatformAdapter } from "./code-platform-adapter";

const MENTION_REGEX = /@([a-zA-Z0-9][a-zA-Z0-9._-]*)/g;

function extractMentionedUsers(body: string): string[] {
    const mentionedUsers = new Set<string>();
    for (const match of body.matchAll(MENTION_REGEX)) {
        const username = (match[1] || "").trim();
        if (username) mentionedUsers.add(username);
    }
    return [...mentionedUsers];
}

function getConfig(): { token: string; owner: string; repo: string } {
    const token = process.env.GITHUB_TOKEN?.trim();
    const owner = process.env.GITHUB_REPO_OWNER?.trim();
    const repo = process.env.GITHUB_REPO_NAME?.trim();

    if (!token) throw new Error("Missing required environment variable: GITHUB_TOKEN");
    if (!owner) throw new Error("Missing required environment variable: GITHUB_REPO_OWNER");
    if (!repo) throw new Error("Missing required environment variable: GITHUB_REPO_NAME");

    return { token, owner, repo };
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
    const url = `https://api.github.com${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            ...((options.headers as Record<string, string>) ?? {}),
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`GitHub API error ${response.status} on ${path}: ${text}`);
    }

    return response.json() as Promise<T>;
}

export class GitHubCodePlatformAdapter implements CodePlatformAdapter {
    async getPullRequestAuthorUsername(prId: string, _platform: PullRequestPlatform): Promise<string | null> {
        const { token, owner, repo } = getConfig();
        const pr = await request<{ user: { login: string } }>(
            `/repos/${owner}/${repo}/pulls/${prId}`,
            token
        );
        return pr.user?.login ?? null;
    }

    async getPullRequestComments(prId: string, _platform: PullRequestPlatform): Promise<PullRequestCommentPayload[]> {
        const { token, owner, repo } = getConfig();

        const [pr, rawComments] = await Promise.all([
            request<{ head: { ref: string } }>(`/repos/${owner}/${repo}/pulls/${prId}`, token),
            request<Array<{ id: number; body: string; user: { login: string }; path?: string; line?: number; original_line?: number }>>(
                `/repos/${owner}/${repo}/pulls/${prId}/comments`,
                token
            ),
        ]);

        const branch = pr.head?.ref ?? "";

        return rawComments.map((c) => ({
            id: String(c.id),
            prId,
            body: c.body ?? "",
            author: c.user?.login ?? "",
            branch,
            mentionedUsers: extractMentionedUsers(c.body ?? ""),
            filePath: c.path,
            lineNumber: c.line ?? c.original_line,
            resolved: false,
        }));
    }

    async postCommentOnPullRequest(prId: string, _platform: PullRequestPlatform, comments: PullRequestComment[]): Promise<void> {
        const { token, owner, repo } = getConfig();
        for (const comment of comments) {
            await request(`/repos/${owner}/${repo}/issues/${prId}/comments`, token, {
                method: "POST",
                body: JSON.stringify({ body: comment.content }),
            });
        }
    }
}
