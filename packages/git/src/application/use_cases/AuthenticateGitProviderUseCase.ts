import { GitProviderFactory } from "@/src/infrastructure/external/GitProviderFactory";

export class AuthenticateGitProviderUseCase {
    async execute(params: { providerType: string; token: string }) {
        const provider = GitProviderFactory.create(params.providerType, params.token);
        const authenticated = await provider.authenticate();

        if (!authenticated) {
            return { success: false };
        }

        const user = await provider.getUser();

        return {
            success: true,
            user
        };
    }
}
