import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PullRequestCommentPayload } from "@/app/services/pr";

const {
	onPullRequestCommentAddedMock,
	bufferCommentMock,
	findUnprocessedBuffersOlderThanMock,
	markProcessedMock,
	githubAdapterMock,
	gitlabAdapterMock,
	bitbucketAdapterMock
} = vi.hoisted(() => {
	const githubAdapterMock = {
		adapt: vi.fn((payload: any) => ({
			id: payload.comment?.id?.toString() || "1",
			prId: payload.pull_request?.number?.toString() || "1",
			body: payload.comment?.body || "",
			author: payload.comment?.user?.login || "user",
			branch: payload.pull_request?.head?.ref || "main",
			mentionedUsers: []
		}))
	};
	const gitlabAdapterMock = {
		adapt: vi.fn((payload: any) => ({
			id: payload.object_attributes?.id?.toString() || "1",
			prId: payload.merge_request?.iid?.toString() || payload.merge_request?.id?.toString() || "1",
			body: payload.object_attributes?.note || "",
			author: payload.user?.username || "user",
			branch: payload.object_attributes?.merge_request?.source_branch || "main",
			mentionedUsers: []
		}))
	};
	const bitbucketAdapterMock = {
		adapt: vi.fn((payload: any) => ({
			id: payload.comment?.id?.toString() || "1",
			prId: payload.pullrequest?.id?.toString() || "1",
			body: payload.comment?.content?.raw || "",
			author: payload.actor?.username || payload.actor?.nickname || payload.actor?.display_name || "user",
			branch: payload.pullrequest?.source?.branch?.name || "main",
			mentionedUsers: []
		}))
	};

	return {
		onPullRequestCommentAddedMock: vi.fn().mockResolvedValue(undefined),
		bufferCommentMock: vi.fn().mockResolvedValue(undefined),
		findUnprocessedBuffersOlderThanMock: vi.fn().mockResolvedValue([]),
		markProcessedMock: vi.fn().mockResolvedValue(undefined),
		githubAdapterMock,
		gitlabAdapterMock,
		bitbucketAdapterMock
	};
});

vi.mock("@/app/services/pr", () => ({
	GitHubPullRequestCommentPayloadAdapter: vi.fn().mockImplementation(function () {
		return githubAdapterMock;
	}),
	GitLabPullRequestCommentPayloadAdapter: vi.fn().mockImplementation(function () {
		return gitlabAdapterMock;
	}),
	BitbucketPullRequestCommentPayloadAdapter: vi.fn().mockImplementation(function () {
		return bitbucketAdapterMock;
	}),
	PullRequestServiceImpl: vi.fn().mockImplementation(function () {
		return {
			onPullRequestCommentAdded: onPullRequestCommentAddedMock,
			onPullRequestMerged: vi.fn()
		};
	}),
	MongoCommentJobBufferPersistenceLayer: vi.fn().mockImplementation(function () {
		return {
			bufferComment: bufferCommentMock,
			findUnprocessedBuffersOlderThan: findUnprocessedBuffersOlderThanMock,
			markProcessed: markProcessedMock
		};
	})
}));

vi.mock("@/brain/runner/runner", () => ({}));
vi.mock("@/brain/runner/opencode", () => ({}));

import { POST } from "@/app/api/webhooks/pr/commented/route";

function createPostRequest(
	platform: string | null,
	body: unknown = { comment: { id: 1, body: "test", user: { login: "user" } }, pull_request: { head: { ref: "main" } } }
): NextRequest {
	const url = platform 
		? `http://localhost:3000/api/webhooks/pr/comments?platform=${platform}`
		: "http://localhost:3000/api/webhooks/pr/comments";

	return new NextRequest(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body)
	});
}

describe("POST /api/webhooks/pr/comments", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Platform Resolution", () => {
		it("should accept 'github' platform", async () => {
			const req = createPostRequest("github", {
				comment: { id: 1, body: "@bot help", user: { login: "user1" } },
				pull_request: { head: { ref: "feature" } }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.platform).toBe("github");
		});

		it("should accept 'gitlab' platform", async () => {
			const req = createPostRequest("gitlab", {
				object_attributes: {
					id: 100,
					note: "@bot review",
					merge_request: { source_branch: "develop" }
				},
				user: { username: "user2" }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.platform).toBe("gitlab");
		});

		it("should accept 'bitbucket' platform", async () => {
			const req = createPostRequest("bitbucket", {
				comment: { id: 50, content: { raw: "@bot deploy" } },
				actor: { username: "user3" },
				pullrequest: { source: { branch: { name: "release" } } }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.platform).toBe("bitbucket");
		});

		it("should handle case-insensitive platform parameter", async () => {
			const req = createPostRequest("GITHUB", {
				comment: { id: 1, body: "test", user: { login: "user" } },
				pull_request: { head: { ref: "main" } }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.platform).toBe("github");
		});

		it("should reject missing platform parameter", async () => {
			const req = createPostRequest(null);
			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Missing or invalid platform");
		});

		it("should reject invalid platform parameter", async () => {
			const req = createPostRequest("invalid");
			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Missing or invalid platform");
		});

		it("should handle whitespace-padded platform parameter", async () => {
			const req = createPostRequest(" bitbucket ", {
				comment: { id: 50, content: { raw: "test" } },
				actor: { username: "user" },
				pullrequest: { source: { branch: { name: "main" } } }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.platform).toBe("bitbucket");
		});
	});

	describe("Payload Parsing", () => {
		it("should reject invalid JSON payload", async () => {
			const url = "http://localhost:3000/api/webhooks/pr/comments?platform=github";
			const req = new NextRequest(url, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{ invalid json }"
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Invalid JSON payload");
		});

		it("should accept valid JSON payload", async () => {
			const payload = {
				comment: { id: 1, body: "test comment", user: { login: "alice" } },
				pull_request: { head: { ref: "feature-x" } }
			};
			const req = createPostRequest("github", payload);

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(data.success).toBe(true);
			expect(data.comment).toBeDefined();
		});
	});

	describe("Adapter Dispatch and Service Integration", () => {
		it("should call GitHub adapter for github platform", async () => {
			const payload = {
				comment: { id: 1, body: "@bot fix bug", user: { login: "user1" } },
				pull_request: { head: { ref: "fix-bug" } }
			};
			const req = createPostRequest("github", payload);

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(onPullRequestCommentAddedMock).toHaveBeenCalledTimes(1);
			expect(onPullRequestCommentAddedMock).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "1",
					body: "@bot fix bug",
					author: "user1",
					branch: "fix-bug"
				}),
				"github"
			);
		});

		it("should call GitLab adapter for gitlab platform", async () => {
			const payload = {
				object_attributes: {
					id: 200,
					note: "@bot review this",
					merge_request: { source_branch: "dev" }
				},
				user: { username: "user2" }
			};
			const req = createPostRequest("gitlab", payload);

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(onPullRequestCommentAddedMock).toHaveBeenCalledTimes(1);
			expect(onPullRequestCommentAddedMock).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "200",
					body: "@bot review this",
					author: "user2",
					branch: "dev"
				}),
				"gitlab"
			);
		});

		it("should call Bitbucket adapter for bitbucket platform", async () => {
			const payload = {
				comment: { id: 300, content: { raw: "@bot deploy now" } },
				actor: { username: "user3" },
				pullrequest: { source: { branch: { name: "prod" } } }
			};
			const req = createPostRequest("bitbucket", payload);

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(200);
			expect(onPullRequestCommentAddedMock).toHaveBeenCalledTimes(1);
			expect(onPullRequestCommentAddedMock).toHaveBeenCalledWith(
				expect.objectContaining({
					id: "300",
					body: "@bot deploy now",
					author: "user3",
					branch: "prod"
				}),
				"bitbucket"
			);
		});

		it("should pass adapted payload to service", async () => {
			const payload = {
				comment: { id: 1, body: "test", user: { login: "user" } },
				pull_request: { head: { ref: "main" } }
			};
			const req = createPostRequest("github", payload);

			await POST(req);

			expect(onPullRequestCommentAddedMock).toHaveBeenCalledWith(
				expect.any(Object),
				"github"
			);

			const [comment] = onPullRequestCommentAddedMock.mock.calls[0];
			expect(comment).toHaveProperty("id");
			expect(comment).toHaveProperty("body");
			expect(comment).toHaveProperty("author");
			expect(comment).toHaveProperty("branch");
			expect(comment).toHaveProperty("mentionedUsers");
		});
	});

	describe("Error Handling", () => {
		it("should catch and return service errors", async () => {
			onPullRequestCommentAddedMock.mockRejectedValue(new Error("Service error"));
			const req = createPostRequest("github", {
				comment: { id: 1, body: "test", user: { login: "user" } },
				pull_request: { head: { ref: "main" } }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Service error");
		});

		it("should catch adapter errors", async () => {
			const req = createPostRequest("github", {
				// Missing required fields for adapter
				comment: {},
				pull_request: {}
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
		});

		it("should return generic error message for unknown errors", async () => {
			onPullRequestCommentAddedMock.mockRejectedValue("Unknown error");
			const req = createPostRequest("github", {
				comment: { id: 1, body: "test", user: { login: "user" } },
				pull_request: { head: { ref: "main" } }
			});

			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data.success).toBe(false);
			expect(data.error).toContain("Unexpected error while processing PR comment webhook");
		});
	});

	describe("Response Format", () => {
		it("should return error response with 400 status for invalid requests", async () => {
			const req = createPostRequest(null);
			const response = await POST(req);
			const data = await response.json();

			expect(response.status).toBe(400);
			expect(data).toEqual({
				success: false,
				error: expect.any(String)
			});
			expect(data.platform).toBeUndefined();
			expect(data.comment).toBeUndefined();
		});
	});
});
