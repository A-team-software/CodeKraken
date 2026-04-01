import { GitProviderFactory } from "@/src/infrastructure/external/GitProviderFactory";

export class GetRepositoriesUseCase {
    async execute(params: { providerType: string; token: string; page?: number; perPage?: number }) {
        const provider = GitProviderFactory.create(params.providerType, params.token);
        return await provider.getRepositories(params.page, params.perPage);
    }
}
