import { ProviderType } from "@oliver/core";
import { OAuthTokenAggregate } from "./aggregate";

export interface OAuthTokenRepository {
    save(token: OAuthTokenAggregate): Promise<OAuthTokenAggregate>;

    findByUserAndProvider(
        userId: string,
        provider: string,
        providerType: ProviderType
    ): Promise<OAuthTokenAggregate | null>;

    /**
     * Retrieves a token scoped to a Jira site (clientKey) rather than an
     * individual user. Used to grant the backend constant access to repos
     * assigned by the site admin from the Forge config panel.
     */
    findByClientKeyAndProvider(
        clientKey: string,
        provider: string,
        providerType: ProviderType
    ): Promise<OAuthTokenAggregate | null>;

    findByAtlassianAccountIdAndCloudId(
        atlassianAccountId: string,
        cloudId: string,
        providerType?: ProviderType,
        provider?: string
    ): Promise<OAuthTokenAggregate | null>;

    findByUser(userId: string): Promise<OAuthTokenAggregate[]>;

    findExpiringSoon(minutes?: number): Promise<OAuthTokenAggregate[]>;

    deleteByUserAndProvider(
        userId: string,
        provider: string,
        providerType: ProviderType
    ): Promise<boolean>;

    deleteAllByUser(userId: string): Promise<number>;
}
