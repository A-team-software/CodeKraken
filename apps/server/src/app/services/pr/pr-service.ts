import { OpenCodeRunner } from "@/brain/runner/opencode";
import { PullRequestPlatform, Runner } from "@/brain/runner/runner";
import { ConfigPersistenceLayer } from "@/brain/runner/config-persistence-layer";
import { MongoConfigPersistenceLayer } from "@/brain/runner/mongo-config-persistence-layer";
import { PullRequestCommentPayload } from "./comment-payload-adatper";
import { CommentJobBufferPersistanceLayer, MongoCommentJobBufferPersistanceLayer } from "./comment-job-buffer-persistance-layer";

export interface OnPullRequestMergedInput {
    prId: string;
    platform: PullRequestPlatform;
    clientId: string;
}

export interface PullRequestService {
    onPullRequestMerged: (input: OnPullRequestMergedInput) => Promise<void>;
    onPullRequestCommentAdded: (comment: PullRequestCommentPayload, platform: PullRequestPlatform) => Promise<void>;
}

export class PullRequestServiceImpl implements PullRequestService {
    constructor(
        private readonly runner: Runner = new OpenCodeRunner(),
        private readonly configPersistenceLayer: ConfigPersistenceLayer = new MongoConfigPersistenceLayer(),
        private readonly commentJobBufferPersistanceLayer: CommentJobBufferPersistanceLayer = new MongoCommentJobBufferPersistanceLayer()
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

        await this.commentJobBufferPersistanceLayer.bufferComment({
            ...comment,
            branch
        });
    }
}
