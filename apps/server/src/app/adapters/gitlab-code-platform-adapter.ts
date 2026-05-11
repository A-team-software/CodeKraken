import { PullRequestCommentPayload } from "@/app/services/pr/comment-payload-adapter";
import { PullRequestComment } from "@/app/types/pull-request-comment";
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

function getConfig(): { token: string; baseUrl: string; projectId: string } {
    const token = process.env.GITLAB_TOKEN?.trim();
    const projectId = process.env.GITLAB_PROJECT_ID?.trim();
    const baseUrl = (process.env.GITLAB_BASE_URL?.trim() ?? "https://gitlab.com").replace(/\/$/, "");

    if (!token) throw new Error("Missing required environment variable: GITLAB_TOKEN");
    if (!projectId) throw new Error("Missing required environment variable: GITLAB_PROJECT_ID");

    return { token, baseUrl, projectId };
}

async function request<T>(baseUrl: string, path: string, token: string, options: RequestInit = {}): Promise<T> {
    const url = `${baseUrl}/api/v4${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
            ...((options.headers as Record<string, string>) ?? {}),
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`GitLab API error ${response.status} on ${path}: ${text}`);
    }

    return response.json() as Promise<T>;
}

async function requestWithHeaders<T>(baseUrl: string, path: string, token: string, options: RequestInit = {}): Promise<{ data: T; headers: Headers }> {
    const url = `${baseUrl}/api/v4${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            "PRIVATE-TOKEN": token,
            "Content-Type": "application/json",
            ...((options.headers as Record<string, string>) ?? {}),
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`GitLab API error ${response.status} on ${path}: ${text}`);
    }

    return { data: (await response.json()) as T, headers: response.headers };
}

async function loadAllGitLabPages<T>(baseUrl: string, path: string, token: string): Promise<T[]> {
    const items: T[] = [];
    let page = 1;

    while (true) {
        const separator = path.includes("?") ? "&" : "?";
        const { data, headers } = await requestWithHeaders<T[]>(
            baseUrl,
            `${path}${separator}per_page=100&page=${page}`,
            token
        );

        items.push(...data);

        const nextPage = headers.get("x-next-page")?.trim();
        if (!nextPage) {
            break;
        }

        page = Number(nextPage);
        if (!Number.isFinite(page) || page <= 0) {
            break;
        }
    }

    return items;
}

export class GitLabCodePlatformAdapter implements CodePlatformAdapter {
    async getPullRequestAuthorUsername(prId: string): Promise<string | null> {
        const { token, baseUrl, projectId } = getConfig();
        const mr = await request<{ author: { username: string } }>(
            baseUrl,
            `/projects/${encodeURIComponent(projectId)}/merge_requests/${prId}`,
            token
        );
        return mr.author?.username ?? null;
    }

    async getPullRequestComments(prId: string): Promise<PullRequestCommentPayload[]> {
        const { token, baseUrl, projectId } = getConfig();
        const encodedProjectId = encodeURIComponent(projectId);

        const [mr, discussions] = await Promise.all([
            request<{ source_branch: string }>(
                baseUrl,
                `/projects/${encodedProjectId}/merge_requests/${prId}`,
                token
            ),
            loadAllGitLabPages<{
                notes: Array<{
                    id: number;
                    body: string;
                    author: { username: string };
                    system: boolean;
                    resolvable?: boolean;
                    resolved?: boolean;
                    position?: { new_path?: string; old_path?: string; new_line?: number; old_line?: number };
                }>;
            }>(
                baseUrl,
                `/projects/${encodedProjectId}/merge_requests/${prId}/discussions`,
                token
            ),
        ]);

        const branch = mr.source_branch ?? "";

        return discussions
            .flatMap((discussion) => discussion.notes ?? [])
            .filter((note) => !note.system)
            .map((note) => ({
                id: String(note.id),
                prId,
                body: note.body ?? "",
                author: note.author?.username ?? "",
                branch,
                mentionedUsers: extractMentionedUsers(note.body ?? ""),
                filePath: note.position?.new_path ?? note.position?.old_path,
                lineNumber: note.position?.new_line ?? note.position?.old_line,
                resolved: note.resolvable ? note.resolved === true : false,
            }));
    }

    async postCommentOnPullRequest(prId: string, comments: PullRequestComment[]): Promise<void> {
        const { token, baseUrl, projectId } = getConfig();
        for (const comment of comments) {
            await request(
                baseUrl,
                `/projects/${encodeURIComponent(projectId)}/merge_requests/${prId}/notes`,
                token,
                {
                    method: "POST",
                    body: JSON.stringify({ body: comment.content }),
                }
            );
        }
    }
}
