import {
    UnifiedWebhook,
    UnifiedEvent,
    WebhookConfigParams,
    UnifiedBoard,
    UnifiedIssue,
    UnifiedTransition,
    IssueFilters,
    CreateIssueParams,
    UpdateIssueParams,
    BoardProviderCapabilities,
    UserProps,
    JiraUserSchema,
} from '@oliver/core';

import { BoardProviderError } from '@oliver/shared';

import {
    JIRA_CLIENT_ID,
    JIRA_CLIENT_SECRET,
    JIRA_CALLBACK_URL,
    JIRA_AUTH_URL,
    JIRA_TOKEN_URL,
    JIRA_SCOPES,
} from '@oliver/auth';

import { Logger } from '@oliver/core';

import { BaseBoardProvider } from './BaseBoardProvider';


export class JiraService extends BaseBoardProvider {
    providerId = 'jira';
    capabilities: BoardProviderCapabilities = {
        supportsWebhooks: true,
        supportsTransitions: true,
        supportsLabels: true,
        supportsAssignees: true,
        supportsPriorities: true,
        supportsAttachments: true,
        supportsComments: true,
        supportsCustomFields: true,
    };

    private domain: string = '';
    private email: string = '';
    private apiToken: string = '';
    private userCache: UserProps | null = null;
    private _siteUrl: string = '';

    private isOAuthToken: boolean = false;
    private cloudId: string | null = null;

    constructor(tokenString: string) {
        super();
        this.parseCredentials(tokenString);
    }

    private parseCredentials(tokenString: string) {
        const parts = tokenString.split('|');
        if (parts.length === 1) {
            // Assume it is an OAuth Bearer token
            this.isOAuthToken = true;
            this.apiToken = tokenString.trim();
            if (!this.apiToken) {
                throw new BoardProviderError('Jira OAuth token cannot be empty.', 'AUTH_FAILED');
            }
            return;
        }

        if (parts.length !== 3) {
            throw new BoardProviderError('Invalid Jira credentials format. Expected: domain|email|token or an OAuth access token', 'AUTH_FAILED');
        }

        this.domain = parts[0].trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
        this.email = parts[1].trim();
        this.apiToken = parts[2].trim();

        if (!this.domain || !this.email || !this.apiToken) {
            throw new BoardProviderError('Jira credentials cannot be empty.', 'AUTH_FAILED');
        }
    }

    private async fetchCloudId(): Promise<void> {
        if (!this.isOAuthToken) return;

        try {
            const response = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    Accept: 'application/json',
                }
            });

            if (!response.ok) {
                Logger.error('Failed to fetch Jira accessible resources', { status: response.status });
                throw new BoardProviderError('Failed to fetch accessible resources for Jira OAuth', 'AUTH_FAILED');
            }

            const resources = await response.json();
            if (!resources || resources.length === 0) {
                throw new BoardProviderError('No Jira sites accessible with this token', 'AUTH_FAILED');
            }

            // Just take the first accessible resource for now
            this.cloudId = resources[0].id;
            this.domain = resources[0].url.replace(/^https?:\/\//, '').replace(/\/$/, '');
        } catch (error: any) {
            if (error instanceof BoardProviderError) throw error;
            throw new BoardProviderError(`Failed to fetch Jira cloud context: ${error?.message}`, 'AUTH_FAILED');
        }
    }

    protected getBaseUrl(): string {
        if (this.isOAuthToken && this.cloudId) {
            return `https://api.atlassian.com/ex/jira/${this.cloudId}`;
        }
        return `https://${this.domain}`;
    }

    protected getAuthHeader(): Record<string, string> {
        if (this.isOAuthToken) {
            return { Authorization: `Bearer ${this.apiToken}` };
        }
        return { Authorization: `Basic ${btoa(`${this.email}:${this.apiToken}`)}` };
    }

    protected async request<T>(
        endpoint: string,
        options: RequestInit = {},
        customHeaders: Record<string, string> = {}
    ): Promise<T> {
        if (this.isOAuthToken && !this.cloudId) {
            await this.fetchCloudId();
        }
        return super.request<T>(endpoint, options, customHeaders);
    }

    async authenticate(token?: string): Promise<boolean> {
        try {
            if (token) {
                this.parseCredentials(token);
            }
            if (this.isOAuthToken && !this.cloudId) {
                await this.fetchCloudId();
            }
            await this.getUser();
            return true;
        } catch (error) {
            Logger.warn('Jira Auth Failed', { error });
            return false;
        }
    }

    async getUser(): Promise<UserProps> {
        if (this.userCache) return this.userCache;
        const data = await this.request<any>('/rest/api/3/myself');
        const parsed = JiraUserSchema.parse(data);

        const profileLink = this.domain
            ? `https://${this.domain}/jira/people/${parsed.accountId}`
            : `https://id.atlassian.com/people/${parsed.accountId}`;

        const siteUrl = this.domain
            ? `https://${this.domain}`
            : 'https://jira.cloud.atlassian.com';

        this._siteUrl = siteUrl;

        this.userCache = {
            name: parsed.displayName,
            username: parsed.displayName,
            email: parsed.emailAddress || '',
            image: parsed.avatarUrls?.['48x48'] || '',
            avatarUrl: parsed.avatarUrls?.['48x48'] || '',
            url: profileLink,
            role: 'user',
            accounts: [],
            settings: {
                opencode: { model: 'llama3-70b-8192' }
            },
            onboardingStep: 'connect',
        };
        return this.userCache;
    }

    /** Returns the Jira site URL resolved during getUser() / authenticate(). */
    getSiteUrl(): string {
        return this._siteUrl || 'https://jira.cloud.atlassian.com';
    }

    async getBoards(page = 1, perPage = 30): Promise<UnifiedBoard[]> {
        const startAt = (page - 1) * perPage;
        const data = await this.request<any>(`/rest/api/3/project/search?startAt=${startAt}&maxResults=${perPage}`);
        const values: any[] = data.values || [];

        const baseUrlForLinks = this.domain ? `https://${this.domain}` : 'https://atlassian.net';

        return values.map((proj: any) => ({
            id: proj.id,
            name: proj.name,
            key: proj.key,
            description: proj.projectTypeKey || null,
            type: proj.projectTypeKey || 'software',
            htmlUrl: `${baseUrlForLinks}/browse/${proj.key}`,
            avatarUrl: proj.avatarUrls?.['48x48'] || '',
            lead: proj.lead ? {
                name: proj.lead.displayName,
                avatarUrl: proj.lead.avatarUrls?.['48x48'] || '',
            } : undefined,
            permissions: { admin: true, write: true, read: true },
        }));
    }

    async getBoard(boardId: string): Promise<UnifiedBoard> {
        const data = await this.request<any>(`/rest/api/3/project/${boardId}`);
        const baseUrlForLinks = this.domain ? `https://${this.domain}` : 'https://atlassian.net';

        return {
            id: data.id,
            name: data.name,
            key: data.key,
            description: data.description || null,
            type: data.projectTypeKey || 'software',
            htmlUrl: `${baseUrlForLinks}/browse/${data.key}`,
            avatarUrl: data.avatarUrls?.['48x48'] || '',
            lead: data.lead ? {
                name: data.lead.displayName,
                avatarUrl: data.lead.avatarUrls?.['48x48'] || '',
            } : undefined,
            permissions: { admin: true, write: true, read: true },
        };
    }

    async getIssues(boardId: string, filters?: IssueFilters): Promise<UnifiedIssue[]> {
        let jql = `project = ${boardId}`;

        if (filters?.status && filters.status.length > 0) {
            jql += ` AND status IN (${filters.status.map(s => `"${s}"`).join(',')})`;
        }
        if (filters?.assignee) {
            jql += ` AND assignee = "${filters.assignee}"`;
        }
        if (filters?.type && filters.type.length > 0) {
            jql += ` AND type IN (${filters.type.map(t => `"${t}"`).join(',')})`;
        }
        if (filters?.search) {
            jql += ` AND text ~ "${filters.search}"`;
        }

        jql += ' ORDER BY updated DESC';

        const data = await this.request<any>(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,assignee,reporter,created,updated,issuetype,priority,labels`);
        const baseUrlForLinks = this.domain ? `https://${this.domain}` : 'https://atlassian.net';

        return (data.issues || []).map((issue: any) => ({
            id: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.description || null,
            type: issue.fields.issuetype?.name || 'Task',
            status: issue.fields.status?.name || 'Unknown',
            priority: issue.fields.priority?.name || 'Medium',
            assignee: issue.fields.assignee ? {
                name: issue.fields.assignee.displayName,
                avatarUrl: issue.fields.assignee.avatarUrls?.['48x48'] || '',
            } : undefined,
            reporter: {
                name: issue.fields.reporter?.displayName || 'Unknown',
                avatarUrl: issue.fields.reporter?.avatarUrls?.['48x48'] || '',
            },
            createdAt: issue.fields.created,
            updatedAt: issue.fields.updated,
            htmlUrl: `${baseUrlForLinks}/browse/${issue.key}`,
            labels: issue.fields.labels || [],
            boardId: boardId,
        }));
    }

    async getIssue(issueId: string): Promise<UnifiedIssue> {
        const data = await this.request<any>(`/rest/api/3/issue/${issueId}`);
        const baseUrlForLinks = this.domain ? `https://${this.domain}` : 'https://atlassian.net';

        return {
            id: data.id,
            key: data.key,
            summary: data.fields.summary,
            description: data.fields.description || null,
            type: data.fields.issuetype?.name || 'Task',
            status: data.fields.status?.name || 'Unknown',
            priority: data.fields.priority?.name || 'Medium',
            assignee: data.fields.assignee ? {
                name: data.fields.assignee.displayName,
                avatarUrl: data.fields.assignee.avatarUrls?.['48x48'] || '',
            } : undefined,
            reporter: {
                name: data.fields.reporter?.displayName || 'Unknown',
                avatarUrl: data.fields.reporter?.avatarUrls?.['48x48'] || '',
            },
            createdAt: data.fields.created,
            updatedAt: data.fields.updated,
            htmlUrl: `${baseUrlForLinks}/browse/${data.key}`,
            labels: data.fields.labels || [],
            boardId: data.fields.project?.id || '',
        };
    }

    async createIssue(boardId: string, params: CreateIssueParams): Promise<UnifiedIssue> {
        const payload = {
            fields: {
                project: { id: boardId },
                summary: params.summary,
                description: params.description || '',
                issuetype: { name: params.type },
                priority: params.priority ? { name: params.priority } : undefined,
                assignee: params.assignee ? { accountId: params.assignee } : undefined,
                labels: params.labels || [],
            },
        };

        const data = await this.request<any>('/rest/api/3/issue', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        return this.getIssue(data.key);
    }

    async updateIssue(issueId: string, params: UpdateIssueParams): Promise<UnifiedIssue> {
        const payload: any = { fields: {} };

        if (params.summary) payload.fields.summary = params.summary;
        if (params.description !== undefined) payload.fields.description = params.description;
        if (params.priority) payload.fields.priority = { name: params.priority };
        if (params.assignee) payload.fields.assignee = { accountId: params.assignee };
        if (params.labels) payload.fields.labels = params.labels;

        await this.request(`/rest/api/3/issue/${issueId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });

        return this.getIssue(issueId);
    }

    async deleteIssue(issueId: string): Promise<void> {
        await this.request(`/rest/api/3/issue/${issueId}`, { method: 'DELETE' });
    }

    async getIssueTransitions(issueId: string): Promise<UnifiedTransition[]> {
        const data = await this.request<any>(`/rest/api/3/issue/${issueId}/transitions`);

        return (data.transitions || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            to: {
                id: t.to.id,
                name: t.to.name,
            },
        }));
    }

    async transitionIssue(issueId: string, transitionId: string): Promise<void> {
        await this.request(`/rest/api/3/issue/${issueId}/transitions`, {
            method: 'POST',
            body: JSON.stringify({
                transition: { id: transitionId },
            }),
        });
    }

    async getWebhooks(boardId: string): Promise<UnifiedWebhook[]> {
        const data = await this.request<any[]>('/rest/webhooks/1.0/webhook');
        return data.map((hook) => {
            const events = hook.events || [];
            return {
                id: hook.self,
                url: hook.url,
                active: hook.enabled !== false,
                events: events,
                createdAt: new Date().toISOString(),
                contentType: 'json' as const,
                insecureSsl: false,
            };
        });
    }

    async createWebhook(boardId: string, params: WebhookConfigParams): Promise<UnifiedWebhook> {
        const jqlFilter = `project = ${boardId}`;
        const payload = {
            name: `Board Manager - ${boardId}`,
            url: params.url,
            events: params.events.includes('*') ? ['jira:issue_created', 'jira:issue_updated', 'jira:issue_deleted'] : params.events,
            filters: { 'issue-related-events-section': jqlFilter },
            excludeBody: false,
        };

        const data = await this.request<any>('/rest/webhooks/1.0/webhook', {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        return {
            id: data.self,
            url: data.url,
            active: data.enabled !== false,
            events: data.events,
            createdAt: new Date().toISOString(),
            contentType: 'json',
            insecureSsl: false,
        };
    }

    async updateWebhook(boardId: string, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook> {
        await this.deleteWebhook(boardId, hookId);
        const newParams: WebhookConfigParams = {
            url: params.url || '',
            events: params.events || [],
            active: params.active ?? true,
            insecureSsl: false,
        };
        return this.createWebhook(boardId, newParams);
    }

    async deleteWebhook(boardId: string, hookId: string): Promise<void> {
        const id = hookId.split('/').pop();
        await this.request(`/rest/webhooks/1.0/webhook/${id}`, { method: 'DELETE' });
    }

    async getActivity(boardId: string): Promise<UnifiedEvent[]> {
        const jql = `project = ${boardId} order by updated desc`;
        const data = await this.request<any>(`/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=10&fields=summary,status,assignee,updated,creator`);

        return (data.issues || []).map((issue: any) => {
            return {
                id: issue.id,
                type: 'issue_update',
                actor: {
                    name: issue.fields.creator?.displayName || 'Unknown',
                    avatarUrl: issue.fields.creator?.avatarUrls?.['48x48'] || '',
                },
                createdAt: issue.fields.updated,
                description: `Updated ${issue.key}: ${issue.fields.summary}`,
            };
        });
    }

    // ---------------------------------------------------------------------------
    // OAuth 2.0 (3LO) helpers – used by the boards OAuth route
    // ---------------------------------------------------------------------------

    static getLoginUrl(state: string): string {
        const params = new URLSearchParams({
            audience: 'api.atlassian.com',
            client_id: JIRA_CLIENT_ID,
            scope: JIRA_SCOPES,
            redirect_uri: JIRA_CALLBACK_URL,
            state: state,
            response_type: 'code',
            prompt: 'consent',
        });

        return `${JIRA_AUTH_URL}?${params.toString()}`;
    }

    static async exchangeCodeForToken(code: string): Promise<{
        access_token: string;
        refresh_token?: string;
        expires_in?: number;
        token_type?: string;
        scope?: string;
    }> {
        try {
            const body = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: JIRA_CLIENT_ID,
                client_secret: JIRA_CLIENT_SECRET,
                redirect_uri: JIRA_CALLBACK_URL,
                code: code,
            });

            const response = await fetch(JIRA_TOKEN_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString(),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || 'Failed to exchange code for token');
            }

            const data = await response.json();
            return {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                token_type: data.token_type || 'Bearer',
                scope: data.scope,
            };
        } catch (error: any) {
            throw new BoardProviderError(
                `Failed to exchange Jira code for token: ${error.message}`,
                'AUTH_FAILED'
            );
        }
    }

}
