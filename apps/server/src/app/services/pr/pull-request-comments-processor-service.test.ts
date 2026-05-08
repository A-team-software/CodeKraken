import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PullRequestCommentsProcessorService } from "./pull-request-comments-processor-service";
import { CommentJobBufferPersistanceLayer, CommentsJobBuffer } from "./comment-job-buffer-persistance-layer";
import { Runner } from "@/brain/runner/runner";

const ORIGINAL_ENV = { ...process.env };

const {
	findUnprocessedBuffersOlderThanMock,
	markProcessedMock,
	bufferCommentMock,
	startMock
} = vi.hoisted(() => ({
	findUnprocessedBuffersOlderThanMock: vi.fn(),
	markProcessedMock: vi.fn(),
	bufferCommentMock: vi.fn(),
	startMock: vi.fn().mockResolvedValue(undefined)
}));

// Mock CommentJobBufferPersistanceLayer
const mockCommentJobBufferPersistanceLayer: CommentJobBufferPersistanceLayer = {
	bufferComment: bufferCommentMock,
	findUnprocessedBuffersOlderThan: findUnprocessedBuffersOlderThanMock,
	markProcessed: markProcessedMock
};

// Mock Runner
const mockRunner: Runner = {
	start: startMock,
	startNextIteration: vi.fn()
};

describe("PullRequestCommentsProcessorService", () => {
	let service: PullRequestCommentsProcessorService;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...ORIGINAL_ENV };
		process.env.OPENCODE_TASK_REPO_URL = "https://github.com/test/repo.git";
		service = new PullRequestCommentsProcessorService(
			mockRunner,
			mockCommentJobBufferPersistanceLayer,
			1000 // 1 second polling interval for tests
		);
	});

	afterEach(() => {
		process.env = { ...ORIGINAL_ENV };
		if (service) {
			service.stop();
		}
	});

	describe("start()", () => {
		it("should set up polling interval", () => {
			const intervalSpy = vi.spyOn(global, "setInterval");
			service.start();
			expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
		});

		it("should only allow one active interval", () => {
			const intervalSpy = vi.spyOn(global, "setInterval");
			service.start();
			service.start();
			expect(intervalSpy).toHaveBeenCalledTimes(1);
		});

		it("should allow restart after stop()", () => {
			const intervalSpy = vi.spyOn(global, "setInterval");
			findUnprocessedBuffersOlderThanMock.mockResolvedValue([]);
			service.start();
			service.stop();
			service.start();
			expect(intervalSpy).toHaveBeenCalledTimes(2);
		});

		it("should call processDueBuffers immediately", async () => {
			findUnprocessedBuffersOlderThanMock.mockResolvedValue([]);
			service.start();
			await new Promise((resolve) => setTimeout(resolve, 50));
			expect(findUnprocessedBuffersOlderThanMock).toHaveBeenCalled();
		});
	});

	describe("processDueBuffers()", () => {
		it("should prevent concurrent processing", async () => {
			findUnprocessedBuffersOlderThanMock.mockResolvedValue([]);
			markProcessedMock.mockResolvedValue(undefined);

			// Call processDueBuffers twice concurrently - the second should be skipped
			const promise1 = (service as any).processDueBuffers();
			const promise2 = (service as any).processDueBuffers();

			await Promise.all([promise1, promise2]);

			// Should only call findUnprocessedBuffersOlderThan once because the second call is skipped due to isProcessing
			expect(findUnprocessedBuffersOlderThanMock).toHaveBeenCalledTimes(1);
		});

		it("should fetch buffers older than 2 minutes", async () => {
			findUnprocessedBuffersOlderThanMock.mockResolvedValue([]);
			await (service as any).processDueBuffers();

			expect(findUnprocessedBuffersOlderThanMock).toHaveBeenCalledTimes(1);
			const callArg = findUnprocessedBuffersOlderThanMock.mock.calls[0][0];
			expect(callArg).toBeLessThanOrEqual(Date.now() - 2 * 60 * 1000);
		});

		it("should handle errors when fetching buffers gracefully", async () => {
			const error = new Error("Database connection failed");
			findUnprocessedBuffersOlderThanMock.mockRejectedValue(error);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			await (service as any).processDueBuffers();

			expect(consoleSpy).toHaveBeenCalledWith("Failed to find unprocessed buffers:", error);
			expect(startMock).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should process multiple buffers", async () => {
			const buffers: CommentsJobBuffer[] = [
				{
					branch: "feature-1",
					prId: "101",
					comments: [
						{ id: "1", prId: "101", body: "Fix the bug", author: "user1", branch: "feature-1", mentionedUsers: [] }
					],
					processed: false,
					createdAt: Date.now(),
					updatedAt: Date.now()
				},
				{
					branch: "feature-2",
					prId: "102",
					comments: [
						{ id: "2", prId: "102", body: "Add feature", author: "user2", branch: "feature-2", mentionedUsers: [] }
					],
					processed: false,
					createdAt: Date.now(),
					updatedAt: Date.now()
				}
			];

			findUnprocessedBuffersOlderThanMock.mockResolvedValue(buffers);
			startMock.mockResolvedValue(undefined);
			markProcessedMock.mockResolvedValue(undefined);

			await (service as any).processDueBuffers();

			expect(startMock).toHaveBeenCalledTimes(2);
			expect(markProcessedMock).toHaveBeenCalledTimes(2);
		});
	});

	describe("processBuffer()", () => {
		it("should skip empty comment buffers and mark as processed", async () => {
			const emptyBuffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			markProcessedMock.mockResolvedValue(undefined);
			await (service as any).processBuffer(emptyBuffer);

			expect(markProcessedMock).toHaveBeenCalledWith("feature", "123");
			expect(startMock).not.toHaveBeenCalled();
		});

		it("should skip processing and log error when repoUrl is not configured", async () => {
			delete process.env.OPENCODE_TASK_REPO_URL;
			delete process.env.OPENCODE_REPO_URL;

			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [
					{ id: "1", prId: "123", body: "test", author: "user1", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			await (service as any).processBuffer(buffer);

			expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("OPENCODE_TASK_REPO_URL"));
			expect(startMock).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		it("should use OPENCODE_REPO_URL as fallback", async () => {
			delete process.env.OPENCODE_TASK_REPO_URL;
			process.env.OPENCODE_REPO_URL = "https://github.com/backup/repo.git";

			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [
					{ id: "1", prId: "123", body: "test", author: "user1", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			startMock.mockResolvedValue(undefined);
			markProcessedMock.mockResolvedValue(undefined);

			await (service as any).processBuffer(buffer);

			expect(startMock).toHaveBeenCalledWith(
				expect.objectContaining({
					repoUrl: "https://github.com/backup/repo.git"
				})
			);
		});

		it("should concatenate multiple comment bodies", async () => {
			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [
					{ id: "1", prId: "123", body: "First comment", author: "user1", branch: "feature", mentionedUsers: [] },
					{ id: "2", prId: "123", body: "  Second comment  ", author: "user2", branch: "feature", mentionedUsers: [] },
					{ id: "3", prId: "123", body: "Third comment", author: "user3", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			startMock.mockResolvedValue(undefined);
			markProcessedMock.mockResolvedValue(undefined);

			await (service as any).processBuffer(buffer);

			expect(startMock).toHaveBeenCalledWith(
				expect.objectContaining({
					task: "First comment\n\nSecond comment\n\nThird comment"
				})
			);
		});

		it("should call runner.start with correct parameters", async () => {
			const buffer: CommentsJobBuffer = {
				branch: "develop",
				prId: "456",
				comments: [
					{ id: "1", prId: "456", body: "Deploy to production", author: "user1", branch: "develop", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			startMock.mockResolvedValue(undefined);
			markProcessedMock.mockResolvedValue(undefined);

			await (service as any).processBuffer(buffer);

			expect(startMock).toHaveBeenCalledWith({
				repoUrl: "https://github.com/test/repo.git",
				mode: "agent",
				task: "Deploy to production",
				branch: "develop",
				vars: {
					prId: "456",
					source: "pr-comment-buffer"
				}
			});
		});

		it("should handle runner.start errors gracefully", async () => {
			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [
					{ id: "1", prId: "123", body: "test", author: "user1", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			const error = new Error("Failed to start job");
			startMock.mockRejectedValue(error);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			await (service as any).processBuffer(buffer);

			expect(consoleSpy).toHaveBeenCalledWith("Failed to start job for buffered comments:", error);
			expect(markProcessedMock).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it("should mark buffer as processed after successful job start", async () => {
			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "789",
				comments: [
					{ id: "1", prId: "789", body: "test task", author: "user1", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			startMock.mockResolvedValue(undefined);
			markProcessedMock.mockResolvedValue(undefined);

			await (service as any).processBuffer(buffer);

			expect(markProcessedMock).toHaveBeenCalledWith("feature", "789");
		});

		it("should handle markProcessed errors with warning", async () => {
			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [
					{ id: "1", prId: "123", body: "test", author: "user1", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			const error = new Error("Failed to update buffer status");
			startMock.mockResolvedValue(undefined);
			markProcessedMock.mockRejectedValue(error);

			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			await (service as any).processBuffer(buffer);

			expect(warnSpy).toHaveBeenCalledWith("Failed to mark buffer processed:", error);

			warnSpy.mockRestore();
		});

		it("should skip buffers with only whitespace comments", async () => {
			const buffer: CommentsJobBuffer = {
				branch: "feature",
				prId: "123",
				comments: [
					{ id: "1", prId: "123", body: "   ", author: "user1", branch: "feature", mentionedUsers: [] },
					{ id: "2", prId: "123", body: "\n\n", author: "user2", branch: "feature", mentionedUsers: [] }
				],
				processed: false,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			markProcessedMock.mockResolvedValue(undefined);
			await (service as any).processBuffer(buffer);

			expect(startMock).not.toHaveBeenCalled();
			expect(markProcessedMock).toHaveBeenCalledWith("feature", "123");
		});
	});
});
