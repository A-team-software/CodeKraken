import { OAuthTokenRepository, ProviderType } from "../../domain";

export class DeleteOAuthTokensUseCase {
    constructor(private tokenRepo: OAuthTokenRepository) { }

    async execute(userId: string, provider: string, providerType: ProviderType): Promise<boolean> {
        return await this.tokenRepo.deleteByUserAndProvider(userId, provider, providerType);
    }
}
