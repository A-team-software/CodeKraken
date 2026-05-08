import { SafeExecute } from "@oliver/core";
import { OpenCodeRunner } from "@/brain/runner/opencode";
import { Runner } from "@/brain/runner/runner";

import { CommentJobBufferPersistanceLayer, CommentsJobBuffer, MongoCommentJobBufferPersistanceLayer } from "./comment-job-buffer-persistance-layer";

const TWO_MINUTES_MS = 2 * 60 * 1000;

export class PullRequestCommentsProcessorService {
    private intervalHandle: NodeJS.Timeout | null = null;
    private isProcessing = false;

    constructor(
        private readonly runner: Runner = new OpenCodeRunner(),
        private readonly commentJobBufferPersistanceLayer: CommentJobBufferPersistanceLayer = new MongoCommentJobBufferPersistanceLayer(),
        private readonly pollingIntervalMs = 30_000
    ) {}

    start(): void {
        if (this.intervalHandle) {
            return;
        }

        this.intervalHandle = setInterval(() => {
            void this.processDueBuffers();
        }, this.pollingIntervalMs);

        void this.processDueBuffers();
    }

    stop(): void {
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = null;
        }
    }

    private async processDueBuffers(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        try {
            const cutoff = Date.now() - TWO_MINUTES_MS;
            const [buffers, findError] = await SafeExecute.withSync(async () =>
                this.commentJobBufferPersistanceLayer.findUnprocessedBuffersOlderThan(cutoff)
            ).execute();

            if (findError || !buffers) {
                if (findError) {
                    console.error("Failed to find unprocessed buffers:", findError);
                }
                return;
            }

            for (const buffer of buffers) {
                try {
                    await this.processBuffer(buffer);
                } catch (error) {
                    console.error(
                        `Failed to process buffered comments for branch "${buffer.branch}" and PR "${buffer.prId}":`,
                        error
                    );
                }
            }
        } catch (error) {
            console.error("Failed to process due buffers:", error);
        } finally {
            this.isProcessing = false;
        }
    }

    private async processBuffer(buffer: CommentsJobBuffer): Promise<void> {
        if (!buffer.comments.length) {
            const [, markError] = await SafeExecute.withSync(async () =>
                this.commentJobBufferPersistanceLayer.markProcessed(buffer.branch, buffer.prId)
            ).execute();
            if (markError) {
                console.warn("Failed to mark buffer processed:", markError);
            }
            return;
        }

        const repoUrl = (process.env.OPENCODE_TASK_REPO_URL || process.env.OPENCODE_REPO_URL || "").trim();
        if (!repoUrl) {
            console.error(
                "Skipping buffered PR comments processing because repoUrl is missing. Set OPENCODE_TASK_REPO_URL or OPENCODE_REPO_URL to process buffered PR comments."
            );
            return;
        }

        const task = buffer.comments
            .map((comment) => comment.body.trim())
            .filter(Boolean)
            .join("\n\n");

        if (!task) {
            const [, markError] = await SafeExecute.withSync(async () =>
                this.commentJobBufferPersistanceLayer.markProcessed(buffer.branch, buffer.prId)
            ).execute();
            if (markError) {
                console.warn("Failed to mark buffer processed:", markError);
            }
            return;
        }

        const [, startError] = await SafeExecute.withSync(async () =>
            this.runner.start({
                repoUrl,
                mode: "agent",
                task,
                branch: buffer.branch,
                vars: {
                    prId: buffer.prId,
                    source: "pr-comment-buffer"
                }
            })
        ).execute();

        if (startError) {
            console.error("Failed to start job for buffered comments:", startError);
            return;
        }

        const [, markError] = await SafeExecute.withSync(async () =>
            this.commentJobBufferPersistanceLayer.markProcessed(buffer.branch, buffer.prId)
        ).execute();
        if (markError) {
            console.warn("Failed to mark buffer processed:", markError);
        }
    }
}
