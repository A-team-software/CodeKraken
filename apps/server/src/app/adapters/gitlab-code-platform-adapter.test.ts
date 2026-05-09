import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitLabCodePlatformAdapter } from "./gitlab-code-platform-adapter";

const ORIGINAL_ENV = { ...process.env };

describe("GitLabCodePlatformAdapter", () => {
    beforeEach(() => {
        process.env = {
            ...ORIGINAL_ENV,
            GITLAB_TOKEN: "gitlab-token",
            GITLAB_PROJECT_ID: "123",
            GITLAB_BASE_URL: "https://gitlab.example.com"
        };
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
        vi.restoreAllMocks();
    });

    it("fetches PR author username", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ author: { username: "reviewer" } }),
            text: async () => ""
        });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new GitLabCodePlatformAdapter();
        await expect(adapter.getPullRequestAuthorUsername("99")).resolves.toBe("reviewer");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://gitlab.example.com/api/v4/projects/123/merge_requests/99",
            expect.objectContaining({
                headers: expect.objectContaining({ "PRIVATE-TOKEN": "gitlab-token" })
            })
        );
    });

    it("fetches unresolved review comments with code context", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ source_branch: "feature-y" }),
                headers: new Headers(),
                text: async () => ""
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ([
                    {
                        notes: [
                            {
                                id: 21,
                                body: "Please update this",
                                author: { username: "reviewer" },
                                system: false,
                                resolvable: true,
                                resolved: false,
                                position: { new_path: "src/lib.ts", new_line: 15 }
                            }
                        ]
                    }
                ]),
                headers: new Headers(),
                text: async () => ""
            });
        vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

        const adapter = new GitLabCodePlatformAdapter();
        await expect(adapter.getPullRequestComments("99")).resolves.toEqual([
            {
                id: "21",
                prId: "99",
                body: "Please update this",
                author: "reviewer",
                branch: "feature-y",
                mentionedUsers: [],
                filePath: "src/lib.ts",
                lineNumber: 15,
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

        const adapter = new GitLabCodePlatformAdapter();
        await adapter.postCommentOnPullRequest("99", [
            { id: "1", authorUsername: "oliver", content: "First", createdAt: new Date() },
            { id: "2", authorUsername: "oliver", content: "Second", createdAt: new Date() }
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://gitlab.example.com/api/v4/projects/123/merge_requests/99/notes",
            expect.objectContaining({ method: "POST" })
        );
    });
});
