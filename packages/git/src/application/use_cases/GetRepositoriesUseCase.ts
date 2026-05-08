import { GitProviderFactory } from "../../infrastructure/external/GitProviderFactory";

export class GetRepositoriesUseCase {
    async execute(params: { providerType: string; token: string; page?: number; perPage?: number; workspace?: string; }) {
        const provider = GitProviderFactory.create(params.providerType, params.token);
        return await provider.getRepositories(params.page, params.perPage, params.workspace);
    }
}
