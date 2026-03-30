import { z } from 'zod';
import {
    UnifiedWebhook,
    UnifiedEvent,
    UnifiedDelivery,
    WebhookConfigParams,
} from '@/lib/shared/types/providers';
import { UnifiedRepository, ProviderCapabilities } from '../../domain/types';
import { GitProviderError } from '@/lib/shared/errors/provider.errors';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, CORS_PROXY, GITHUB_AUTH_URL, GITHUB_TOKEN_URL } from '@/lib/infrastructure/config/oauth.config';
import { Logger } from '@/lib/infrastructure/logging/logger';
import { BaseGitProvider } from './BaseGitProvider';
import { UserProps } from '@/lib/user';

// --- Zod Schemas ---
const UserSchema = z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
    html_url: z.string(),
});

const RepoSchema = z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: UserSchema,
    description: z.string().nullable(),
    private: z.boolean(),
    html_url: z.string(),
    updated_at: z.string(),
    default_branch: z.string().optional().default('main'),
    language: z.string().nullable(),
    stargazers_count: z.number(),
    forks_count: z.number(),
    open_issues_count: z.number().optional(),
    watchers_count: z.number().optional(),
    permissions: z
        .object({
            admin: z.boolean(),
            push: z.boolean(),
            pull: z.boolean(),
        })
        .optional(),
});

const WebhookSchema = z.object({
    id: z.number(),
    active: z.boolean(),
    events: z.array(z.string()),
    config: z.object({
        url: z.string(),
        content_type: z.string(),
        insecure_ssl: z.string(),
        secret: z.string().optional(),
    }),
    created_at: z.string(),
});

export class GitHubService extends BaseGitProvider {
    providerId = 'github';
    capabilities: ProviderCapabilities = {
        hasDeliveryHistory: true,
        canPing: true,
        canRedeliver: true,
        supportsInsecureSsl: true,
        supportsContentTypeConfiguration: true,
        supportsWebhookSecrets: true,
    };

    private token: string;
    private userCache: UserProps | null = null;

    constructor(token: string) {
        super();
        this.token = token;
    }

    protected getBaseUrl(): string {
        return 'https://api.github.com';
    }

    protected getAuthHeader(): Record<string, string> {
        return {
            Authorization: `token ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
        };
    }

    private mapRepository(repo: z.infer<typeof RepoSchema>): UnifiedRepository {
        return {
            id: repo.id.toString(),
            name: repo.name,
            slug: repo.name,
            owner: repo.owner.login,
            fullName: repo.full_name,
            description: repo.description,
            isPrivate: repo.private,
            htmlUrl: repo.html_url,
            language: repo.language,
            defaultBranch: repo.default_branch,
            updatedAt: repo.updated_at,
            stats: {
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                issues: repo.open_issues_count,
                watchers: repo.watchers_count,
            },
            permissions: repo.permissions || { admin: false, push: false, pull: false },
        };
    }

    private mapWebhook(hook: z.infer<typeof WebhookSchema>): UnifiedWebhook {
        return {
            id: hook.id.toString(),
            url: hook.config.url,
            active: hook.active,
            events: hook.events,
            createdAt: hook.created_at,
            contentType: hook.config.content_type === 'json' ? 'json' : 'form',
            insecureSsl: hook.config.insecure_ssl === '1',
        };
    }

    async authenticate(token?: string): Promise<boolean> {
        if (token) this.token = token;
        try {
            await this.getUser();
            return true;
        } catch (e) {
            Logger.warn('GitHub Authentication Check Failed', { error: e });
            return false;
        }
    }

    async getUser(): Promise<UserProps> {
        if (this.userCache) return this.userCache;
        const data = await this.request<any>('/user');
        const parsed = UserSchema.parse(data);
        this.userCache = {
            name: parsed.login,
            username: parsed.login,
            email: '',
            image: parsed.avatar_url,
            avatarUrl: parsed.avatar_url,
            url: parsed.html_url,
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
        const parsed = UserSchema.parse(data);
        return parsed.id.toString();
    }

    async getRepositories(page = 1, perPage = 30): Promise<UnifiedRepository[]> {
        const data = await this.request<any[]>(`/user/repos?sort=updated&per_page=${perPage}&page=${page}&type=all`);
        return data
            .map((item) => {
                const result = RepoSchema.safeParse(item);
                if (!result.success) {
                    Logger.warn('Skipping invalid repository data', { error: result.error, item });
                    return null;
                }
                return this.mapRepository(result.data);
            })
            .filter((r): r is UnifiedRepository => r !== null);
    }

    async getWebhooks(repo: UnifiedRepository): Promise<UnifiedWebhook[]> {
        const data = await this.request<any[]>(`/repos/${repo.owner}/${repo.slug}/hooks`);
        return data
            .map((item) => {
                const result = WebhookSchema.safeParse(item);
                if (!result.success) {
                    Logger.warn('Skipping invalid webhook data', { error: result.error, item });
                    return null;
                }
                return this.mapWebhook(result.data);
            })
            .filter((h): h is UnifiedWebhook => h !== null);
    }

    async createWebhook(repo: UnifiedRepository, params: WebhookConfigParams): Promise<UnifiedWebhook> {
        const payload = {
            name: 'web',
            active: params.active,
            events: params.events,
            config: {
                url: params.url,
                content_type: params.contentType || 'json',
                insecure_ssl: params.insecureSsl ? '1' : '0',
                secret: params.secret,
            },
        };
        const data = await this.request<any>(`/repos/${repo.owner}/${repo.slug}/hooks`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return this.mapWebhook(WebhookSchema.parse(data));
    }

    async updateWebhook(repo: UnifiedRepository, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook> {
        const payload: any = {};
        if (params.active !== undefined) payload.active = params.active;
        if (params.events) payload.events = params.events;

        if (params.url || params.secret || params.insecureSsl !== undefined) {
            payload.config = {};
            if (params.url) payload.config.url = params.url;
            if (params.contentType) payload.config.content_type = params.contentType;
            if (params.secret) payload.config.secret = params.secret;
            if (params.insecureSsl !== undefined) payload.config.insecure_ssl = params.insecureSsl ? '1' : '0';
        }

        const data = await this.request<any>(`/repos/${repo.owner}/${repo.slug}/hooks/${hookId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return this.mapWebhook(WebhookSchema.parse(data));
    }

    async deleteWebhook(repo: UnifiedRepository, hookId: string): Promise<void> {
        await this.request(`/repos/${repo.owner}/${repo.slug}/hooks/${hookId}`, { method: 'DELETE' });
    }

    async getWebhookDeliveries(repo: UnifiedRepository, hookId: string): Promise<UnifiedDelivery[]> {
        const data = await this.request<any[]>(`/repos/${repo.owner}/${repo.slug}/hooks/${hookId}/deliveries?per_page=15`);
        return data.map((d) => ({
            id: d.id.toString(),
            deliveredAt: d.delivered_at,
            status: d.status_code >= 200 && d.status_code < 300 ? 'success' : 'failure',
            statusCode: d.status_code,
            event: d.event,
            duration: d.duration,
        }));
    }

    async redeliverWebhook(repo: UnifiedRepository, hookId: string, deliveryId: string): Promise<void> {
        await this.request(`/repos/${repo.owner}/${repo.slug}/hooks/${hookId}/deliveries/${deliveryId}/attempts`, {
            method: 'POST',
        });
    }

    async pingWebhook(repo: UnifiedRepository, hookId: string): Promise<void> {
        await this.request(`/repos/${repo.owner}/${repo.slug}/hooks/${hookId}/pings`, { method: 'POST' });
    }

    async getEvents(repo: UnifiedRepository): Promise<UnifiedEvent[]> {
        const data = await this.request<any[]>(`/repos/${repo.owner}/${repo.slug}/events?per_page=15`);
        return data
            .map((e: any): UnifiedEvent | null => {
                if (!e.id || !e.type) return null;
                return {
                    id: e.id,
                    type: e.type,
                    actor: { name: e.actor?.login || 'unknown', avatarUrl: e.actor?.avatar_url || '' },
                    createdAt: e.created_at,
                    description: e.type,
                };
            })
            .filter((e): e is UnifiedEvent => e !== null);
    }

    async getLanguages(repo: UnifiedRepository): Promise<Record<string, number>> {
        return this.request(`/repos/${repo.owner}/${repo.slug}/languages`);
    }

    async getProjectRoles(repo: UnifiedRepository): Promise<string[]> {
        return [];
    }

    static getLoginUrl(state: string, redirectUri?: string) {
        const params = new URLSearchParams({
            client_id: GITHUB_CLIENT_ID,
            scope: 'repo,admin:repo_hook',
            state
        });
        if (redirectUri) params.set('redirect_uri', redirectUri);
        return `${GITHUB_AUTH_URL}?${params.toString()}`;
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
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            };
            if (redirectUri) params.redirect_uri = redirectUri;

            const body = new URLSearchParams(params);
            const res = await fetch(GITHUB_TOKEN_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            });

            if (!res.ok) {
                if (res.status === 403) {
                    const text = await res.text();
                    if (text.includes('demo') || text.includes('See /corsdemo')) {
                        throw new Error(
                            'CORS Proxy Access Required. Please visit https://cors-anywhere.herokuapp.com/corsdemo to enable temporary access for this demo.'
                        );
                    }
                }
                throw new Error('Token exchange failed');
            }

            const data = await res.json();
            if (data.error) throw new Error(data.error_description);

            return {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                token_type: data.token_type || 'Bearer',
                scope: data.scope,
            };
        } catch (e: any) {
            Logger.error('GitHub OAuth Exchange Failed', e);
            throw new GitProviderError(e.message, 'AUTH_FAILED', e);
        }
    }
}
