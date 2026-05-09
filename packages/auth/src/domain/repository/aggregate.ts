import { AggregateRoot } from '@oliver/shared';
import { createTokenRefreshedEvent, createTokenRevokedEvent, OAuthTokenProps, OAuthTokenZodSchema, ProviderType } from '@oliver/core';



export class OAuthTokenAggregate extends AggregateRoot {
    private props: OAuthTokenProps;

    private constructor(props: OAuthTokenProps) {
        super();
        this.props = props;
    }

    static create(props: Omit<OAuthTokenProps, 'id' | 'createdAt' | 'updatedAt'>, id?: string): OAuthTokenAggregate {
        const now = new Date();
        const validated = OAuthTokenZodSchema.parse({
            ...props,
            id,
            createdAt: now,
            updatedAt: now,
        });

        return new OAuthTokenAggregate(validated);
    }

    static fromPersistence(props: OAuthTokenProps): OAuthTokenAggregate {
        const validated = OAuthTokenZodSchema.parse(props);
        return new OAuthTokenAggregate(validated);
    }

    get id(): string | undefined { return this.props.id; }
    get userId(): string { return this.props.userId; }
    get clientKey(): string | undefined { return this.props.clientKey; }
    get cloudId(): string | undefined { return this.props.cloudId; }
    get atlassianAccountId(): string | undefined { return this.props.atlassianAccountId; }
    get provider(): string { return this.props.provider; }
    get providerType(): ProviderType { return this.props.providerType; }
    get accessToken(): string | undefined | null { return this.props.accessToken; }
    get refreshToken(): string | undefined { return this.props.refreshToken; }
    get expiresAt(): Date | undefined { return this.props.expiresAt; }
    get tokenType(): string { return this.props.tokenType; }
    get scope(): string | undefined { return this.props.scope; }

    refresh(newAccessToken: string, newRefreshToken?: string, expiresAt?: Date): void {
        this.props.accessToken = newAccessToken;
        if (newRefreshToken) this.props.refreshToken = newRefreshToken;
        if (expiresAt) this.props.expiresAt = expiresAt;
        this.props.updatedAt = new Date();

        this.addDomainEvent(
            createTokenRefreshedEvent({
                userId: this.props.userId,
                provider: this.props.provider,
                providerType: this.props.providerType,
                accessToken: newAccessToken,
                expiresAt,
            })
        );
    }

    revoke(): void {
        this.addDomainEvent(
            createTokenRevokedEvent({
                userId: this.props.userId,
                provider: this.props.provider,
                providerType: this.props.providerType,
            })
        );
    }

    toPersistence(): OAuthTokenProps {
        return { ...this.props };
    }
}
