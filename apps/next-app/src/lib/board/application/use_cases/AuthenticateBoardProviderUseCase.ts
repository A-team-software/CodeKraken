import { BoardProviderFactory } from "../../infrastructure/external/BoardProviderFactory";

export class AuthenticateBoardProviderUseCase {
    async execute(params: { providerType: string; token: string }) {
        const provider = BoardProviderFactory.create(params.providerType, params.token);
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
