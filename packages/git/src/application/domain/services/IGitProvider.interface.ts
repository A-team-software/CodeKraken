import { UnifiedWebhook, UnifiedDelivery, UnifiedEvent, WebhookConfigParams, UnifiedRepository, ProviderCapabilities, UserProps } from '@oliver/core';

/**
 * Interface for Git providers (GitHub, Bitbucket, GitLab, etc.)
 * Defines the contract for repository management, webhooks, and Git-specific operations
 */
export interface IGitProvider {
    providerId: string;
    capabilities: ProviderCapabilities;

    // Auth & User
    authenticate(token?: string): Promise<boolean>;
    getUser(): Promise<UserProps>;
    getProviderAccountId(): Promise<string>;

    // Repositories
    getWorkspaces(): Promise<{ slug: string; name: string; }[]>;
    getRepositories(page?: number, perPage?: number, workspace?: string): Promise<UnifiedRepository[]>;

    // Webhooks
    getWebhooks(repo: UnifiedRepository): Promise<UnifiedWebhook[]>;
    createWebhook(repo: UnifiedRepository, params: WebhookConfigParams): Promise<UnifiedWebhook>;
    updateWebhook(repo: UnifiedRepository, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook>;
    deleteWebhook(repo: UnifiedRepository, hookId: string): Promise<void>;

    // Advanced / Diagnostics
    getWebhookDeliveries(repo: UnifiedRepository, hookId: string): Promise<UnifiedDelivery[]>;
    redeliverWebhook(repo: UnifiedRepository, hookId: string, deliveryId: string): Promise<void>;
    pingWebhook(repo: UnifiedRepository, hookId: string): Promise<void>;

    // Analytics & Metadata
    getEvents(repo: UnifiedRepository): Promise<UnifiedEvent[]>;
    getLanguages(repo: UnifiedRepository): Promise<Record<string, number>>;
    getProjectRoles(repo: UnifiedRepository): Promise<string[]>;
}
