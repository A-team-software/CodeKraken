import { ProviderType } from '@oliver/core';
import { GetValidAccessTokenUseCase } from './use_cases/GetValidAccessTokenUseCase';
import { GenerateOAuthStateUseCase } from './use_cases/GenerateOAuthStateUseCase';
import { DeleteOAuthTokensUseCase } from './use_cases/DeleteOAuthTokensUseCase';
import { MongoOAuthTokenRepository } from '../infrastructure/repositories/OAuthTokenRepository.mongo';
import { MongoOAuthStateRepository } from '../infrastructure/repositories/OAuthStateRepository.mongo';
import { RefreshTokenUseCase } from './use_cases/RefreshTokenUseCase';

/**
 * AuthService
 * Application service facade for OAuth operations.
 * Consolidates logic previously found in services/oauth/
 */
export class AuthService {
    private static instance: AuthService;

    private tokenRepo = new MongoOAuthTokenRepository();
    private stateRepo = new MongoOAuthStateRepository();

    private refreshTokenUseCase = new RefreshTokenUseCase(this.tokenRepo);
    private getValidTokenUseCase = new GetValidAccessTokenUseCase(this.tokenRepo, this.refreshTokenUseCase);
    private generateStateUseCase = new GenerateOAuthStateUseCase(this.stateRepo);
    private deleteTokensUseCase = new DeleteOAuthTokensUseCase(this.tokenRepo);

    private constructor() { }

    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Generates and stores a new OAuth state token.
     */
    async generateState(provider: string, metadata?: string): Promise<string> {
        return await this.generateStateUseCase.execute(provider, metadata);
    }

    /**
     * Deletes OAuth tokens for a user and provider.
     */
    async deleteTokens(userId: string, provider: string, providerType: ProviderType): Promise<boolean> {
        return await this.deleteTokensUseCase.execute(userId, provider, providerType);
    }

    /**
     * Retrieves a valid access token, refreshing it if necessary.
     */
    async getValidAccessToken(userId: string, provider: string, providerType: ProviderType): Promise<string | null> {
        return await this.getValidTokenUseCase.execute(userId, provider, providerType);
    }

    /**
     * Helper for API routes to get valid token and user ID from cookies.
     */
    async getValidTokenAndUserFromRequest(
        cookies: any,
        request: any,
        provider: string,
        providerType: ProviderType
    ): Promise<{ accessToken: string; userId: string } | null> {
        const cookieStore = await cookies();

        let tokenCookieName = '';
        let userCookieName = '';

        if (providerType === 'git') {
            const { TOKEN_COOKIE_NAME } = await import('@oliver/core');
            tokenCookieName = `${TOKEN_COOKIE_NAME}_${provider}`;
            userCookieName = `${TOKEN_COOKIE_NAME}_user_${provider}`;
        } else {
            tokenCookieName = `board_provider_token_${provider}`;
            userCookieName = `board_provider_user_${provider}`;
        }

        const accessTokenCookie = cookieStore.get(tokenCookieName);
        const userIdCookie = cookieStore.get(userCookieName);

        if (!accessTokenCookie?.value || !userIdCookie?.value) {
            return null;
        }

        const userId = userIdCookie.value;
        const validAccessToken = await this.getValidAccessToken(userId, provider, providerType);

        if (!validAccessToken) return null;

        return { accessToken: validAccessToken, userId };
    }
}
