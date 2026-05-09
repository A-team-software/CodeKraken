import { PullRequestCommentPayload } from "@/app/services/pr/comment-payload-adapter";
import { PullRequestComment } from "@/types/pull-request-comment";
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

function getConfig(): { token: string; workspace: string; repoSlug: string } {
    const token = process.env.BITBUCKET_TOKEN?.trim();
    const workspace = process.env.BITBUCKET_WORKSPACE?.trim();
    const repoSlug = process.env.BITBUCKET_REPO_SLUG?.trim();

    if (!token) throw new Error("Missing required environment variable: BITBUCKET_TOKEN");
    if (!workspace) throw new Error("Missing required environment variable: BITBUCKET_WORKSPACE");
    if (!repoSlug) throw new Error("Missing required environment variable: BITBUCKET_REPO_SLUG");

    return { token, workspace, repoSlug };
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
    const url = `https://api.bitbucket.org/2.0${path}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...((options.headers as Record<string, string>) ?? {}),
        },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`Bitbucket API error ${response.status} on ${path}: ${text}`);
    }

    return response.json() as Promise<T>;
}

type BitbucketPage<T> = {
    next?: string | null;
    values?: T[];
};

async function loadAllBitbucketPages<T>(path: string, token: string): Promise<T[]> {
    const items: T[] = [];
    let nextPath: string | null = path;

    while (nextPath) {
        const page: BitbucketPage<T> = await request<BitbucketPage<T>>(nextPath, token);
        if (Array.isArray(page.values)) {
            items.push(...page.values);
        }

        if (page.next) {
            const nextUrl: URL = new URL(page.next);
            nextPath = `${nextUrl.pathname}${nextUrl.search}`;
        } else {
            nextPath = null;
        }
    }

    return items;
}

export class BitbucketCodePlatformAdapter implements CodePlatformAdapter {
    async getPullRequestAuthorUsername(prId: string): Promise<string | null> {
        const { token, workspace, repoSlug } = getConfig();
        const pr = await request<{ author: { nickname: string; display_name: string } }>(
            `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`,
            token
        );
        return pr.author?.nickname ?? pr.author?.display_name ?? null;
    }

    async getPullRequestComments(prId: string): Promise<PullRequestCommentPayload[]> {
        const { token, workspace, repoSlug } = getConfig();
        const basePath = `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}`;

        const [pr, commentsPage] = await Promise.all([
            request<{ source: { branch: { name: string } } }>(basePath, token),
            loadAllBitbucketPages<{
                id: number;
                content: { raw: string };
                user: { nickname: string; display_name: string };
                inline?: { path?: string; to?: number; from?: number };
                deleted?: boolean;
                resolution?: unknown;
            }>(`${basePath}/comments?pagelen=100`, token),
        ]);

        const branch = pr.source?.branch?.name ?? "";

        return commentsPage.map((c) => {
            const body = c.content?.raw ?? "";
            return {
                id: String(c.id),
                prId,
                body,
                author: c.user?.nickname ?? c.user?.display_name ?? "",
                branch,
                mentionedUsers: extractMentionedUsers(body),
                filePath: c.inline?.path,
                lineNumber: c.inline?.to ?? c.inline?.from,
                resolved: c.deleted === true || c.resolution !== undefined,
            };
        });
    }

    async postCommentOnPullRequest(prId: string, comments: PullRequestComment[]): Promise<void> {
        const { token, workspace, repoSlug } = getConfig();
        for (const comment of comments) {
            await request(
                `/repositories/${workspace}/${repoSlug}/pullrequests/${prId}/comments`,
                token,
                {
                    method: "POST",
                    body: JSON.stringify({ content: { raw: comment.content } }),
                }
            );
        }
    }
}
