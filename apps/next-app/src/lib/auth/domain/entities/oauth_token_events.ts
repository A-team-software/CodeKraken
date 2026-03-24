import { DomainEvent } from '@/lib/shared/events';

export const TOKEN_REFRESHED = 'oauth.token_refreshed' as const;
export const TOKEN_REVOKED = 'oauth.token_revoked' as const;

export interface TokenRefreshedPayload {
    userId: string;
    provider: string;
    providerType: 'git' | 'board';
    accessToken: string;
    expiresAt?: Date;
}

export interface TokenRevokedPayload {
    userId: string;
    provider: string;
    providerType: 'git' | 'board';
}

export function createTokenRefreshedEvent(payload: TokenRefreshedPayload): DomainEvent<TokenRefreshedPayload> {
    return {
        eventName: TOKEN_REFRESHED,
        occurredAt: new Date(),
        payload,
    };
}

export function createTokenRevokedEvent(payload: TokenRevokedPayload): DomainEvent<TokenRevokedPayload> {
    return {
        eventName: TOKEN_REVOKED,
        occurredAt: new Date(),
        payload,
    };
}
