import { OAuthTokenRepository, ProviderType } from "../../domain";
import { RefreshTokenUseCase } from "./RefreshTokenUseCase";
import { Logger } from "@/lib/infrastructure/logging/logger";

export class GetValidAccessTokenUseCase {
    constructor(
        private tokenRepo: OAuthTokenRepository,
        private refreshTokenUseCase: RefreshTokenUseCase
    ) { }

    async execute(
        userId: string,
        provider: string,
        providerType: ProviderType,
        bufferMinutes: number = 5
    ): Promise<string | null> {
        try {
            const aggregate = await this.tokenRepo.findByUserAndProvider(userId, provider, providerType);

            if (!aggregate) {
                Logger.warn(`No token found for ${provider}`, { userId, providerType });
                return null;
            }

            // If no expiry, token is still valid
            if (!aggregate.expiresAt) {
                return aggregate.accessToken;
            }

            // Check if token is expired or expiring soon
            const expiryTime = new Date(aggregate.expiresAt).getTime();
            const bufferTime = bufferMinutes * 60 * 1000;
            const now = Date.now();

            if (expiryTime - now > bufferTime) {
                return aggregate.accessToken;
            }

            // Token is expired or expiring soon, refresh it
            Logger.info(`Token expiring soon for ${provider}, refreshing...`, {
                userId,
                providerType,
                expiresAt: aggregate.expiresAt,
            });

            const refreshed = await this.refreshTokenUseCase.execute({ userId, provider, providerType });
            return refreshed?.accessToken || null;
        } catch (error: any) {
            Logger.error(`Error getting valid access token for ${provider}`, {
                error: error.message,
                userId,
                providerType,
            });
            return null;
        }
    }
}
