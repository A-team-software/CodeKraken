import { GitProviderFactory } from "../../infrastructure/external";

export class GetWorkspacesUseCase {

    async execute(params: { providerType: string; token: string; }) {
        const provider = GitProviderFactory.create(params.providerType, params.token)
        return await provider.getWorkspaces();
    }
}
