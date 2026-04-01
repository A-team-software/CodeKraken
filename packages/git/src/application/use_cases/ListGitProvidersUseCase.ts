import { GitProviderFactory } from "@/src/infrastructure/external/GitProviderFactory";

export class ListGitProvidersUseCase {
    async execute() {
        return GitProviderFactory.getAllProviders().map((p) => ({
            id: p.id,
            name: p.name,
            supportsOAuth: p.supportsOAuth,
            tokenPlaceholder: p.tokenPlaceholder,
            tokenDescription: p.tokenDescription,
        }));
    }
}
