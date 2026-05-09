import { OpenCodeRunner } from "@/brain/runner/opencode";
import { Runner } from "@/brain/runner/runner";
import { ConfigPersistenceLayer } from "@/brain/runner/config-persistence-layer";
import { MongoConfigPersistenceLayer } from "@/brain/runner/mongo-config-persistence-layer";
import { JobPersistenceLayer } from "@/brain/runner/job-persistence-layer";
import { MongoJobPersistenceLayer } from "@/brain/runner/mongo-job-persistence-layer";
import { PullRequestCommentPayload } from "./comment-payload-adapter";
import { CommentJobBufferPersistenceLayer, MongoCommentJobBufferPersistenceLayer } from "./comment-job-buffer-persistence-layer";
import { ReviewPayload } from "./review-payload-adapter";
import { PullRequestPlatform } from "@/types/pull-request-platform";
import { PullRequestComment } from "@/types/pull-request-comment";
import { createCodePlatformAdapter } from "@/app/adapters/code-platform-adapter";

export interface OnPullRequestMergedInput {
    prId: string;
    platform: PullRequestPlatform;
    clientId: string;
}

export interface PullRequestService {
    onPullRequestMerged: (input: OnPullRequestMergedInput) => Promise<void>;
    onPullRequestCommentAdded: (comment: PullRequestCommentPayload, platform: PullRequestPlatform) => Promise<void>;
    onPullRequestReviewed: (review: ReviewPayload, platform: PullRequestPlatform) => Promise<void>;
}

export class PullRequestServiceImpl implements PullRequestService {
    constructor(
        private readonly runner: Runner = new OpenCodeRunner(),
        private readonly configPersistenceLayer: ConfigPersistenceLayer = new MongoConfigPersistenceLayer(),
        private readonly commentJobBufferPersistenceLayer: CommentJobBufferPersistenceLayer = new MongoCommentJobBufferPersistenceLayer(),
        private readonly jobPersistenceLayer: JobPersistenceLayer = new MongoJobPersistenceLayer()
    ) {}

    async onPullRequestMerged(input: OnPullRequestMergedInput): Promise<void> {
        const timeoutMs = 500;
        const tenantConfig = await Promise.race<Awaited<ReturnType<ConfigPersistenceLayer["getTenantConfig"]>> | null>([
            this.configPersistenceLayer.getTenantConfig(input.clientId).catch(() => null),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
        ]);
        if (!tenantConfig?.incrementalPrsOn) {
            return;
        }

        await this.runner.startNextIteration(input.prId, input.platform);
    }

    async onPullRequestReviewed(review: ReviewPayload, platform: PullRequestPlatform): Promise<void> {
        const adapter = createCodePlatformAdapter(platform);

        if (review.status === "rejected") {
            await this.handleRejectedReview();
            return;
        }

        if (review.status === "approved") {
            await this.handleApprovedReview(review, platform, adapter);
            return;
        }

        if (review.status === "changes_requested") {
            await this.handleChangesRequestedReview(review, platform, adapter);
            return;
        }
    }

    private async handleRejectedReview(): Promise<void> {
        return;
    }

    private async handleApprovedReview(
        review: ReviewPayload,
        platform: PullRequestPlatform,
        adapter: ReturnType<typeof createCodePlatformAdapter>
    ): Promise<void> {
        const job = await this.jobPersistenceLayer.findLatestJobByPrId(review.id);
        const isIncremental = job?.isIncremental === true;

        const commentContent = isIncremental
            ? "Thanks for the approval. Please merge this pull request so the incremental workflow can continue with the next tasks in the plan."
            : "Thanks for the approval. Please go ahead and merge this pull request when you're ready.";

        const comments: PullRequestComment[] = [
            {
                id: `approval-thanks-${review.id}`,
                authorUsername: "oliver-ai",
                content: commentContent,
                createdAt: new Date()
            }
        ];

            await adapter.postCommentOnPullRequest(review.id, comments);
    }

    private async handleChangesRequestedReview(
        review: ReviewPayload,
        platform: PullRequestPlatform,
        adapter: ReturnType<typeof createCodePlatformAdapter>
    ): Promise<void> {
        const allComments = await adapter.getPullRequestComments(review.id);
        const unresolvedComments = allComments.filter((comment) => comment.resolved !== true);

        if (!unresolvedComments.length) {
            await adapter.postCommentOnPullRequest(review.id, [
                this.buildServiceComment(
                    review.id,
                    "Thanks for the review. Could you provide a detailed explanation of the requested changes and point us to the relevant code sections?"
                )
            ]);
            return;
        }

        const codeChangeComments = unresolvedComments.filter(
            (comment) => Boolean(comment.filePath?.trim()) || typeof comment.lineNumber === "number"
        );

        if (!codeChangeComments.length) {
            await adapter.postCommentOnPullRequest(review.id, [
                this.buildServiceComment(
                    review.id,
                    "Thanks for the requested changes. Please share a detailed, code-specific explanation (file and line references) so we can address the feedback precisely."
                )
            ]);
            return;
        }

        const repoUrl = this.resolveRepoUrl();
        const task = this.buildChangesRequestedTask(codeChangeComments);

        await this.runner.start({
            repoUrl,
            mode: "agent",
            task,
            branch: review.branch,
            vars: {
                prId: review.id,
                platform,
                source: "pr-review-changes-requested"
            }
        });
    }

    private resolveRepoUrl(): string {
        const repoUrl = (process.env.OPENCODE_TASK_REPO_URL || process.env.OPENCODE_REPO_URL || "").trim();
        if (!repoUrl) {
            throw new Error("Missing repository URL. Set OPENCODE_TASK_REPO_URL or OPENCODE_REPO_URL to process requested PR changes.");
        }

        return repoUrl;
    }

    private buildServiceComment(prId: string, content: string): PullRequestComment {
        return {
            id: `service-comment-${prId}-${Date.now()}`,
            authorUsername: "oliver-ai",
            content,
            createdAt: new Date()
        };
    }

    private buildChangesRequestedTask(comments: PullRequestCommentPayload[]): string {
        const commentsSection = comments
            .map((comment, index) => {
                const location = comment.filePath
                    ? `${comment.filePath}${typeof comment.lineNumber === "number" ? `:${comment.lineNumber}` : ""}`
                    : "(no file/line provided)";
                return `${index + 1}. [${location}] ${comment.author}: ${comment.body}`;
            })
            .join("\n");

        return [
            "Address the pull request feedback listed below.",
            "Work ONLY on comments that concern code changes (file/line specific feedback).",
            "Do not act on non-code requests unless they are required to satisfy a code change comment.",
            "After applying the changes, ensure the affected code compiles or passes relevant checks.",
            "",
            "Unresolved code-related review comments:",
            commentsSection,
        ].join("\n");
    }

    async onPullRequestCommentAdded(comment: PullRequestCommentPayload, platform: PullRequestPlatform): Promise<void> {
        const appUserByPlatform: Record<PullRequestPlatform, string | undefined> = {
            github: process.env.GITHUB_APP_USER,
            gitlab: process.env.GITLAB_APP_USER,
            bitbucket: process.env.BITBUCKET_APP_USER
        };

        const configuredAppUser = appUserByPlatform[platform]?.trim().toLowerCase();
        if (!configuredAppUser) {
            return;
        }

        const isAppMentioned = comment.mentionedUsers.some((mentionedUser) => mentionedUser.trim().toLowerCase() === configuredAppUser);
        if (!isAppMentioned) {
            return;
        }

        const branch = comment.branch?.trim();
        if (!branch) {
            throw new Error("Missing pull request branch in comment payload.");
        }

        await this.commentJobBufferPersistenceLayer.bufferComment({
            ...comment,
            branch
        });
    }
}
