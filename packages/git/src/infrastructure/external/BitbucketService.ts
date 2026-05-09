import {
    UnifiedWebhook,
    UnifiedEvent,
    UnifiedDelivery,
    WebhookConfigParams,
    Logger,
    UserProps,
    UnifiedRepository, ProviderCapabilities,
} from '@oliver/core';


import { GitProviderError } from '@oliver/shared';
import { BITBUCKET_CLIENT_ID, BITBUCKET_CLIENT_SECRET, BITBUCKET_AUTH_URL, BITBUCKET_TOKEN_URL } from '@oliver/core';
import { BaseGitProvider } from './BaseGitProvider';

export class BitbucketService extends BaseGitProvider {
    providerId = 'bitbucket';
    capabilities: ProviderCapabilities = {
        hasDeliveryHistory: false, // Bitbucket might have it but keeping simple for now
        canPing: false,
        canRedeliver: false,
        supportsInsecureSsl: false,
        supportsContentTypeConfiguration: false,
        supportsWebhookSecrets: false,
    };

    private token: string;
    private userCache: UserProps | null = null;

    constructor(token: string) {
        super();
        this.token = token;
    }

    protected getBaseUrl(): string {
        return 'https://api.bitbucket.org/2.0';
    }

    protected getAuthHeader(): Record<string, string> {
        return {
            Authorization: `Bearer ${this.token}`,
        };
    }

    static getLoginUrl(state: string, redirectUri?: string) {
        const params = new URLSearchParams({
            client_id: BITBUCKET_CLIENT_ID,
            response_type: 'code',
            state,
        });
        if (redirectUri) params.set('redirect_uri', redirectUri);
        return `${BITBUCKET_AUTH_URL}?${params.toString()}`;
    }

    static async exchangeCodeForToken(code: string, redirectUri?: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
    }> {
        try {
            const params: Record<string, string> = {
                grant_type: 'authorization_code',
                code,
            };
            if (redirectUri) params.redirect_uri = redirectUri;

            // Bitbucket requires Basic Auth with client_id:client_secret for token exchange usually,
            // or just in body. Let's try body first as per OAuth2 standard, but Bitbucket docs say Basic Auth is preferred.
            // Actually many providers accept client_id/secret in body. 
            // If this fails, we might need Basic Auth header: `Basic ${btoa(id:secret)}`.

            const res = await fetch(BITBUCKET_TOKEN_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${BITBUCKET_CLIENT_ID}:${BITBUCKET_CLIENT_SECRET}`).toString('base64')}`
                },
                body: new URLSearchParams(params),
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Token exchange failed: ${res.status} ${text}`);
            }

            const data = await res.json();
            if (data.error) throw new Error(data.error_description || data.error);

            return {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                token_type: data.token_type || 'Bearer',
                scope: data.scope,
            };
        } catch (e: any) {
            Logger.error('Bitbucket OAuth Exchange Failed', e);
            throw new GitProviderError(e.message, 'AUTH_FAILED', e);
        }
    }

    async authenticate(token?: string): Promise<boolean> {
        if (token) this.token = token;
        try {
            await this.getUser();
            return true;
        } catch (e) {
            return false;
        }
    }

    async getUser(): Promise<UserProps> {
        if (this.userCache) return this.userCache;
        const data = await this.request<any>('/user');
        this.userCache = {
            name: data.display_name || data.username,
            username: data.username || data.display_name,
            email: '',
            image: data.links?.avatar?.href || '',
            avatarUrl: data.links?.avatar?.href || '',
            url: data.links?.html?.href || '',
            role: 'user',
            accounts: [],
            settings: {
                opencode: { model: 'llama3-70b-8192' }
            },
            onboardingStep: 'connect',
        };
        return this.userCache;
    }

    async getProviderAccountId(): Promise<string> {
        const data = await this.request<any>('/user');
        return data.account_id || data.uuid || data.username;
    }

    async getWorkspaces(): Promise<{ slug: string; name: string; }[]> {
        const data = await this.request<any>('/workspaces');
        return (data.values || []).map((w: any) => ({
            slug: w.slug,
            name: w.name,
        }));
    }

    private mapRepository(r: any): UnifiedRepository {
        return {
            id: r.uuid,
            name: r.name,
            slug: r.slug,
            owner: r.workspace?.slug || r.owner?.username || 'unknown',
            fullName: r.full_name,
            description: r.description || null,
            isPrivate: r.is_private,
            htmlUrl: r.links?.html?.href,
            language: r.language || null,
            defaultBranch: r.mainbranch?.name || 'main',
            updatedAt: r.updated_on,
            stats: {
                stars: 0,
                forks: 0,
                issues: 0,
                watchers: 0,
            },
            permissions: {
                admin: false,
                push: false,
                pull: false,
            },
        };
    }

    async getRepositories(page = 1, perPage = 30, workspace?: string): Promise<UnifiedRepository[]> {
        if (!workspace) return [];
        const data = await this.request<any>(`/repositories/${workspace}?page=${page}&pagelen=${perPage}`);
        return (data.values || []).map((r: any) => this.mapRepository(r));
    }

    async getWebhooks(repo: UnifiedRepository): Promise<UnifiedWebhook[]> {
        return [];
    }

    async createWebhook(repo: UnifiedRepository, params: WebhookConfigParams): Promise<UnifiedWebhook> {
        throw new Error('Method not implemented.');
    }

    async updateWebhook(repo: UnifiedRepository, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook> {
        throw new Error('Method not implemented.');
    }

    async deleteWebhook(repo: UnifiedRepository, hookId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async getWebhookDeliveries(repo: UnifiedRepository, hookId: string): Promise<UnifiedDelivery[]> {
        return [];
    }

    async redeliverWebhook(repo: UnifiedRepository, hookId: string, deliveryId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async pingWebhook(repo: UnifiedRepository, hookId: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async getEvents(repo: UnifiedRepository): Promise<UnifiedEvent[]> {
        return [];
    }

    async getLanguages(repo: UnifiedRepository): Promise<Record<string, number>> {
        return {};
    }

    async getProjectRoles(repo: UnifiedRepository): Promise<string[]> {
        return [];
    }
}
