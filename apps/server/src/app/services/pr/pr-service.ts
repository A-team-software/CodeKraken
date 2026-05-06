import { OpenCodeRunner } from "@/brain/runner/opencode";
import { PullRequestPlatform, Runner } from "@/brain/runner/runner";
import { ConfigPersistenceLayer } from "@/brain/runner/config-persistence-layer";
import { MongoConfigPersistenceLayer } from "@/brain/runner/mongo-config-persistence-layer";

export interface OnPullRequestMergedInput {
    prId: string;
    platform: PullRequestPlatform;
    clientId: string;
}

export interface PullRequestService {
    onPullRequestMerged: (input: OnPullRequestMergedInput) => Promise<void>;
}

export class PullRequestServiceImpl implements PullRequestService {
    constructor(
        private readonly runner: Runner = new OpenCodeRunner(),
        private readonly configPersistenceLayer: ConfigPersistenceLayer = new MongoConfigPersistenceLayer()
    ) {}

    async onPullRequestMerged(input: OnPullRequestMergedInput): Promise<void> {
        const tenantConfig = await this.configPersistenceLayer.getTenantConfig(input.clientId);
        if (!tenantConfig?.incrementalPrsOn) {
            return;
        }

        await this.runner.startNextIteration(input.prId, input.platform);
    }
}
