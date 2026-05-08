import { OpenCodeRunner } from "@/brain/runner/opencode";
import { PullRequestPlatform, Runner } from "@/brain/runner/runner";
import { ConfigPersistenceLayer } from "@/brain/runner/config-persistence-layer";
import { MongoConfigPersistenceLayer } from "@/brain/runner/mongo-config-persistence-layer";
import { PullRequestCommentPayload } from "./comment-payload-adatper";

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
        private readonly configPersistenceLayer: ConfigPersistenceLayer = new MongoConfigPersistenceLayer()
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
}
