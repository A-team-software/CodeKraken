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

async function requestGraphQL<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`GitHub GraphQL API error ${response.status}: ${text}`);
    }

    const payload = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
    if (payload.errors?.length) {
        throw new Error(`GitHub GraphQL API error: ${payload.errors.map((error) => error.message).join("; ")}`);
    }

    if (!payload.data) {
        throw new Error("GitHub GraphQL API returned no data.");
    }

    return payload.data;
}

type GitHubReviewThreadComment = {
    id: string;
    body: string;
    path?: string | null;
    line?: number | null;
    author?: { login?: string | null } | null;
};

type GitHubReviewThread = {
    isResolved: boolean;
    comments: GitHubReviewThreadComment[];
};

type GitHubReviewThreadsQueryData = {
    repository: {
        pullRequest: {
            reviewThreads: {
                nodes: Array<{
                    isResolved: boolean;
                    comments: {
                        nodes: Array<{
                            databaseId?: number | null;
                            id: string;
                            body: string;
                            path?: string | null;
                            line?: number | null;
                            author?: { login?: string | null } | null;
                        }>;
                    };
                }>;
                pageInfo: { hasNextPage: boolean; endCursor: string | null };
            };
        } | null;
    } | null;
};

type GitHubReviewThreadsConnection = NonNullable<NonNullable<GitHubReviewThreadsQueryData["repository"]>["pullRequest"]>["reviewThreads"];

async function loadGitHubReviewThreads(token: string, owner: string, repo: string, prNumber: number): Promise<GitHubReviewThread[]> {
    const threads: GitHubReviewThread[] = [];

    let after: string | null = null;
    do {
        const response: GitHubReviewThreadsQueryData = await requestGraphQL<GitHubReviewThreadsQueryData>(
            token,
            `query($owner: String!, $repo: String!, $number: Int!, $after: String) {
                repository(owner: $owner, name: $repo) {
                    pullRequest(number: $number) {
                        reviewThreads(first: 100, after: $after) {
                            nodes {
                                isResolved
                                comments(first: 100) {
                                    nodes {
                                        databaseId
                                        id
                                        body
                                        path
                                        line
                                        author {
                                            login
                                        }
                                    }
                                }
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }
                }
            }`,
            { owner, repo, number: prNumber, after }
        );

        const reviewThreads: GitHubReviewThreadsConnection | null | undefined = response.repository?.pullRequest?.reviewThreads;
        if (!reviewThreads) {
            break;
        }

        threads.push(...reviewThreads.nodes.map((thread): GitHubReviewThread => ({
            isResolved: thread.isResolved,
            comments: thread.comments.nodes.map((comment): GitHubReviewThreadComment => ({
                id: String(comment.databaseId ?? comment.id),
                body: comment.body,
                path: comment.path,
                line: comment.line,
                author: comment.author
            }))
        })));

        after = reviewThreads.pageInfo.hasNextPage ? reviewThreads.pageInfo.endCursor : null;
    } while (after);

    return threads;
}

export class GitHubCodePlatformAdapter implements CodePlatformAdapter {
    async getPullRequestAuthorUsername(prId: string): Promise<string | null> {
        const { token, owner, repo } = getConfig();
        const pr = await request<{ user: { login: string } }>(
            `/repos/${owner}/${repo}/pulls/${prId}`,
            token
        );
        return pr.user?.login ?? null;
    }

    async getPullRequestComments(prId: string): Promise<PullRequestCommentPayload[]> {
        const { token, owner, repo } = getConfig();

        const [pr, reviewThreads] = await Promise.all([
            request<{ head: { ref: string } }>(`/repos/${owner}/${repo}/pulls/${prId}`, token),
            loadGitHubReviewThreads(token, owner, repo, Number(prId))
        ]);

        const branch = pr.head?.ref ?? "";

        return reviewThreads.flatMap((thread) =>
            thread.comments.map((comment) => ({
                id: comment.id,
                prId,
                body: comment.body ?? "",
                author: comment.author?.login ?? "",
                branch,
                mentionedUsers: extractMentionedUsers(comment.body ?? ""),
                filePath: comment.path ?? undefined,
                lineNumber: comment.line ?? undefined,
                resolved: thread.isResolved,
            }))
        );
    }

    async postCommentOnPullRequest(prId: string, comments: PullRequestComment[]): Promise<void> {
        const { token, owner, repo } = getConfig();
        for (const comment of comments) {
            await request(`/repos/${owner}/${repo}/issues/${prId}/comments`, token, {
                method: "POST",
                body: JSON.stringify({ body: comment.content }),
            });
        }
    }
}
