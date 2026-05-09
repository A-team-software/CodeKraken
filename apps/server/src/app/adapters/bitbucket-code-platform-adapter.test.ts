import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BitbucketCodePlatformAdapter } from "./bitbucket-code-platform-adapter";

const ORIGINAL_ENV = { ...process.env };

describe("BitbucketCodePlatformAdapter", () => {
    beforeEach(() => {
        process.env = {
            ...ORIGINAL_ENV,
            BITBUCKET_TOKEN: "bitbucket-token",
            BITBUCKET_WORKSPACE: "acme",
            BITBUCKET_REPO_SLUG: "repo"
        };
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
        vi.restoreAllMocks();
    });

    it("fetches PR author username", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ author: { nickname: "reviewer" } }),
            text: async () => ""
        });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new BitbucketCodePlatformAdapter();
        await expect(adapter.getPullRequestAuthorUsername("88", "bitbucket")).resolves.toBe("reviewer");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.bitbucket.org/2.0/repositories/acme/repo/pullrequests/88",
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: "Bearer bitbucket-token" })
            })
        );
    });

    it("fetches review comments with code context", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ source: { branch: { name: "feature-z" } } }),
                text: async () => ""
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    values: [
                        {
                            id: 31,
                            content: { raw: "Please fix" },
                            user: { nickname: "reviewer", display_name: "Reviewer" },
                            inline: { path: "src/main.ts", to: 20 }
                        }
                    ]
                }),
                text: async () => ""
            });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new BitbucketCodePlatformAdapter();
        await expect(adapter.getPullRequestComments("88", "bitbucket")).resolves.toEqual([
            {
                id: "31",
                prId: "88",
                body: "Please fix",
                author: "reviewer",
                branch: "feature-z",
                mentionedUsers: [],
                filePath: "src/main.ts",
                lineNumber: 20,
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

        const adapter = new BitbucketCodePlatformAdapter();
        await adapter.postCommentOnPullRequest("88", "bitbucket", [
            { id: "1", authorUsername: "oliver", content: "First", createdAt: new Date() },
            { id: "2", authorUsername: "oliver", content: "Second", createdAt: new Date() }
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://api.bitbucket.org/2.0/repositories/acme/repo/pullrequests/88/comments",
            expect.objectContaining({ method: "POST" })
        );
    });
});
