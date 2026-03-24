import { OAuthStateRepository, OAuthTokenRepository, OAuthTokenAggregate, ProviderType } from "../../domain";
import { Logger } from "@/lib/infrastructure/logging/logger";
import { BoardProviderFactory } from "@/lib/board/infrastructure/external/BoardProviderFactory";
import { SynchronizeUserUseCase } from "@/lib/user/application/use_cases/SynchronizeUserUseCase";
import { AtlassianConnectService } from "@/lib/application/services/AtlassianConnectService";
import { JiraService } from "@/lib/board/infrastructure/external/JiraService";

export interface ProcessOAuthCallbackCommand {
    provider: string;
    providerType: ProviderType;
    code: string;
    state: string;
    redirectUri?: string;
}

export interface ProcessOAuthCallbackResult {
    systemUserId: string;
    onboardingStep: string;
    accessToken: string;
    metadata?: Record<string, any>;
}

export class ProcessOAuthCallbackUseCase {
    constructor(
        private stateRepo: OAuthStateRepository,
        private tokenRepo: OAuthTokenRepository,
        private syncUserUseCase: SynchronizeUserUseCase
    ) { }

    async execute(cmd: ProcessOAuthCallbackCommand): Promise<ProcessOAuthCallbackResult> {
        const { provider, providerType, code, state, redirectUri } = cmd;

        // 1. Validate state
        const storedState = await this.stateRepo.findByState(state);
        if (!storedState || storedState.provider !== provider || (storedState.expiresAt && Date.now() > storedState.expiresAt.getTime())) {
            if (storedState) await this.stateRepo.deleteByState(state);
            throw new Error('Invalid or expired state parameter');
        }
        await this.stateRepo.deleteByState(state);

        // 2. Exchange code for token
        let tokenResponse: any;
        if (providerType === 'board') {
            tokenResponse = await BoardProviderFactory.exchangeCodeForToken(provider, code, redirectUri);
        } else {
            if (provider === 'github') {
                const { GitHubService } = await import('@/lib/git/infrastructure/external/GitHubService');
                tokenResponse = await GitHubService.exchangeCodeForToken(code, redirectUri);
            } else if (provider === 'bitbucket') {
                const { BitbucketService } = await import('@/lib/git/infrastructure/external/BitbucketService');
                tokenResponse = await BitbucketService.exchangeCodeForToken(code, redirectUri);
            } else {
                throw new Error(`OAuth callback not implemented for git provider: ${provider}`);
            }
        }

        const accessToken = tokenResponse.access_token;

        // 3. Authenticate and get user profile from provider
        let providerUser: any;
        let boardProvider: any;
        if (providerType === 'board') {
            boardProvider = BoardProviderFactory.create(provider, accessToken);
            const authenticated = await boardProvider.authenticate();
            if (!authenticated) throw new Error('Failed to authenticate with provider');
            providerUser = await boardProvider.getUser();
        } else {
            const { GitProviderFactory } = await import('@/lib/git/infrastructure/external/GitProviderFactory');
            const gitProvider = GitProviderFactory.create(provider, accessToken);
            providerUser = await gitProvider.getUser();
        }

        // 4. Synchronize system user
        const systemUser = await this.syncUserUseCase.execute({
            email: providerUser.email,
            username: providerUser.username,
            name: providerUser.name,
            image: providerUser.image,
            avatarUrl: providerUser.avatarUrl,
            url: providerUser.url,
        });

        const systemUserId = systemUser.id!;
        const onboardingStep = systemUser.onboardingStep || 'connect';

        // 4.5. Link account to user aggregate if not already linked
        try {
            const connectedAccount = {
                provider: provider as any,
                providerAccountId: providerUser.id || providerUser.accountId || providerUser.username,
                username: providerUser.username || providerUser.name,
                avatarUrl: providerUser.avatarUrl || providerUser.image,
                profileUrl: providerUser.url,
                email: providerUser.email,
                accessToken: accessToken,
                refreshToken: tokenResponse.refresh_token,
                expiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : undefined
            };
            systemUser.linkAccount(connectedAccount);
        } catch (linkError: any) {
            // Already linked? Just ignore or log
            Logger.info('Account already linked or failed to link', { userId: systemUserId, provider });
        }

        // 5. Store OAuth tokens
        const expiresAt = tokenResponse.expires_in
            ? new Date(Date.now() + tokenResponse.expires_in * 1000)
            : undefined;

        const metadata = storedState.metadata ? JSON.parse(storedState.metadata) : {};

        const tokenAggregate = OAuthTokenAggregate.create({
            userId: systemUserId,
            provider,
            providerType,
            accessToken,
            refreshToken: tokenResponse.refresh_token,
            expiresAt,
            tokenType: tokenResponse.token_type || 'Bearer',
            scope: tokenResponse.scope,
            clientKey: metadata.cloudId,
            cloudId: metadata.cloudId,
            atlassianAccountId: metadata.accountId
        });

        await this.tokenRepo.save(tokenAggregate);

        // 6. Provider-specific side effects (e.g., Jira site access)
        if (metadata.accountId && metadata.cloudId) {
            try {
                const atlassianAccountId = metadata.accountId;
                const cloudId = metadata.cloudId;

                // For Jira board provider, we can get the site URL from the service
                // For other providers (e.g. Git), we might need to get it from cloudId or rely on common registration
                // For Forge, the cloudId itself is the identifier we use as clientKey.
                // We use a dummy protocol to satisfy the URL parser in storeUserSiteAccess.
                const siteUrl = metadata.forge ? `forge://${cloudId}` : `https://${cloudId}.atlassian.net`;

                const atlassianService = new AtlassianConnectService();
                await atlassianService.storeUserSiteAccess(
                    systemUserId,
                    siteUrl,
                    tokenResponse.scope || (providerType === 'board' ? 'read:me' : 'repo'),
                    expiresAt,
                    atlassianAccountId,
                    cloudId
                );
            } catch (error) {
                Logger.error('Failed to store Jira site access in use case', error);
            }
        }

        return {
            systemUserId,
            onboardingStep,
            accessToken,
            metadata
        };
    }
}
