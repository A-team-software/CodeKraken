import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubCodePlatformAdapter } from "./github-code-platform-adapter";

const ORIGINAL_ENV = { ...process.env };

describe("GitHubCodePlatformAdapter", () => {
    beforeEach(() => {
        process.env = {
            ...ORIGINAL_ENV,
            GITHUB_TOKEN: "github-token",
            GITHUB_REPO_OWNER: "acme",
            GITHUB_REPO_NAME: "repo"
        };
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
        vi.restoreAllMocks();
    });

    it("fetches PR author username", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ user: { login: "octocat" } }),
            text: async () => ""
        });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new GitHubCodePlatformAdapter();
        await expect(adapter.getPullRequestAuthorUsername("123", "github")).resolves.toBe("octocat");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.github.com/repos/acme/repo/pulls/123",
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: "token github-token" })
            })
        );
    });

    it("fetches PR review comments with code context", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ head: { ref: "feature-x" } }),
                text: async () => ""
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ([
                    {
                        id: 11,
                        body: "Looks good",
                        user: { login: "reviewer" },
                        path: "src/app.ts",
                        line: 10,
                        original_line: 10
                    }
                ]),
                text: async () => ""
            });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new GitHubCodePlatformAdapter();
        await expect(adapter.getPullRequestComments("123", "github")).resolves.toEqual([
            {
                id: "11",
                prId: "123",
                body: "Looks good",
                author: "reviewer",
                branch: "feature-x",
                mentionedUsers: [],
                filePath: "src/app.ts",
                lineNumber: 10,
                resolved: false
            }
        ]);
    });

    it("posts multiple comments", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({}),
            text: async () => ""
        });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new GitHubCodePlatformAdapter();
        await adapter.postCommentOnPullRequest("123", "github", [
            { id: "1", authorUsername: "oliver", content: "First", createdAt: new Date() },
            { id: "2", authorUsername: "oliver", content: "Second", createdAt: new Date() }
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://api.github.com/repos/acme/repo/issues/123/comments",
            expect.objectContaining({ method: "POST" })
        );
    });
});
