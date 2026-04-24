import { OAuthTokenRepository, OAuthTokenAggregate, ProviderType } from "../../domain";
import { Logger } from "@/lib/infrastructure/logging/logger";
import { EventBus } from "@/lib/shared/events";

export interface RefreshTokenCommand {
    userId: string;
    provider: string;
    providerType: ProviderType;
}

const REFRESH_CONFIGS = {
    github: {
        tokenUrl: 'https://github.com/login/oauth/access_token',
        clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
    bitbucket: {
        tokenUrl: 'https://bitbucket.org/site/oauth2/access_token',
        clientId: process.env.NEXT_PUBLIC_BITBUCKET_CLIENT_ID || '',
        clientSecret: process.env.BITBUCKET_CLIENT_SECRET || '',
    },
    jira: {
        tokenUrl: 'https://auth.atlassian.com/oauth/token',
        clientId: process.env.NEXT_PUBLIC_JIRA_CLIENT_ID || '',
        clientSecret: process.env.JIRA_CLIENT_SECRET || '',
    },
    asana: {
        tokenUrl: 'https://app.asana.com/-/oauth_token',
        clientId: process.env.NEXT_PUBLIC_ASANA_CLIENT_ID || '',
        clientSecret: process.env.ASANA_CLIENT_SECRET || '',
    },
    linear: {
        tokenUrl: 'https://api.linear.app/oauth/token',
        clientId: process.env.NEXT_PUBLIC_LINEAR_CLIENT_ID || '',
        clientSecret: process.env.LINEAR_CLIENT_SECRET || '',
    },
};

export class RefreshTokenUseCase {
    constructor(
        private tokenRepo: OAuthTokenRepository,
        private eventBus: EventBus = EventBus.getInstance()
    ) { }

    async execute(cmd: RefreshTokenCommand): Promise<OAuthTokenAggregate | null> {
        const { userId, provider, providerType } = cmd;

        const aggregate = await this.tokenRepo.findByUserAndProvider(userId, provider, providerType);

        if (!aggregate || !aggregate.refreshToken) {
            Logger.error(`No refresh token found for ${provider}`, { userId, providerType });
            return null;
        }

        if (provider === 'trello') {
            return aggregate;
        }

        const config = REFRESH_CONFIGS[provider as keyof typeof REFRESH_CONFIGS];
        if (!config) {
            Logger.error(`No refresh configuration for provider: ${provider}`);
            return null;
        }

        try {
            const response = await fetch(config.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: aggregate.refreshToken,
                    client_id: config.clientId,
                    client_secret: config.clientSecret,
                }).toString(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                Logger.error(`Token refresh failed for ${provider}`, {
                    status: response.status,
                    error: errorText,
                });
                return null;
            }

            const data = await response.json();

            if (!data.access_token) {
                Logger.error(`No access token in refresh response for ${provider}`);
                return null;
            }

            const expiresAt = data.expires_in
                ? new Date(Date.now() + data.expires_in * 1000)
                : undefined;

            aggregate.refresh(
                data.access_token,
                data.refresh_token || aggregate.refreshToken,
                expiresAt
            );

            await this.tokenRepo.save(aggregate);
            await this.eventBus.publishAll(aggregate.domainEvents);
            aggregate.clearDomainEvents();

            Logger.info(`Successfully refreshed token for ${provider}`, { userId, providerType });

            return aggregate;
        } catch (error: any) {
            Logger.error(`Token refresh error for ${provider}`, {
                error: error.message,
                userId,
                providerType,
            });
            return null;
        }
    }
}
