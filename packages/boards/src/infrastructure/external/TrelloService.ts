import {
    UnifiedWebhook,
    UnifiedEvent,
    WebhookConfigParams,
    UnifiedBoard,
    UnifiedIssue,
    UnifiedTransition,
    IssueFilters,
    CreateIssueParams,
    UserProps,
    UpdateIssueParams,
    BoardProviderCapabilities,
} from '@oliver/core';

import { BaseBoardProvider } from './BaseBoardProvider';

import { BoardProviderError } from '@oliver/shared';

const TRELLO_API_KEY = process.env.NEXT_PUBLIC_TRELLO_CLIENT_ID || '';
const TRELLO_CALLBACK_URL = process.env.TRELLO_CALLBACK_URL || 'https://oliver-server-qw6b.vercel.app/api/boards/trello/callback';
const TRELLO_AUTH_URL = 'https://trello.com/1/authorize';


/**
 * Trello Service - Implements IBoardProvider for Trello
 * Uses Trello REST API v1
 */
export class TrelloService extends BaseBoardProvider {
    providerId = 'trello';
    capabilities: BoardProviderCapabilities = {
        supportsWebhooks: true,
        supportsTransitions: false,
        supportsLabels: true,
        supportsAssignees: true,
        supportsPriorities: false,
        supportsAttachments: true,
        supportsComments: true,
        supportsCustomFields: false,
    };

    private apiToken: string;

    constructor(token: string) {
        super();
        this.apiToken = token;
    }

    protected getBaseUrl(): string {
        return 'https://api.trello.com/1';
    }

    protected getAuthHeader(): Record<string, string> {
        // Trello uses query params for auth: key and token
        return {};
    }

    protected async request<T>(
        endpoint: string,
        options: RequestInit = {},
        customHeaders: Record<string, string> = {}
    ): Promise<T> {
        const url = new URL(`${this.getBaseUrl()}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`);
        url.searchParams.append('key', TRELLO_API_KEY);
        url.searchParams.append('token', this.apiToken);

        return super.request<T>(url.toString().replace(this.getBaseUrl(), ''), options, customHeaders);
    }

    async authenticate(token?: string): Promise<boolean> {
        if (token) this.apiToken = token;
        try {
            await this.request('/members/me');
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUser(): Promise<UserProps> {
        const user = await this.request<any>('/members/me');

        return {
            name: user.fullName,
            username: user.username,
            email: user.email || '',
            image: user.avatarUrl ? `${user.avatarUrl}/170.png` : '',
            avatarUrl: user.avatarUrl ? `${user.avatarUrl}/170.png` : '',
            url: user.url,
            role: 'user',
            accounts: [],
            settings: {
                opencode: { model: 'llama3-70b-8192' }
            },
            onboardingStep: 'connect',
        };
    }

    async getBoards(page = 1, perPage = 30): Promise<UnifiedBoard[]> {
        const boards = await this.request<any[]>('/members/me/boards?fields=name,desc,url,prefs,memberships');

        return boards.map((board: any) => ({
            id: board.id,
            name: board.name,
            key: board.id,
            description: board.desc || '',
            type: 'board',
            htmlUrl: board.url,
            avatarUrl: board.prefs?.backgroundImage || '',
            permissions: {
                admin: board.memberships?.some((m: any) => m.idMember === 'me' && m.memberType === 'admin') || true,
                write: true,
                read: true,
            },
        }));
    }

    async getBoard(boardId: string): Promise<UnifiedBoard> {
        const board = await this.request<any>(`/boards/${boardId}`);

        return {
            id: board.id,
            name: board.name,
            key: board.id,
            description: board.desc || '',
            type: 'board',
            htmlUrl: board.url,
            avatarUrl: board.prefs?.backgroundImage || '',
            permissions: {
                admin: true,
                write: true,
                read: true,
            },
        };
    }

    async getIssues(boardId: string, filters?: IssueFilters): Promise<UnifiedIssue[]> {
        const cards = await this.request<any[]>(`/boards/${boardId}/cards?fields=name,desc,closed,due,idList,url,labels,dateLastActivity`);

        let filteredCards = cards;

        // Apply filters
        if (filters?.status) {
            const statusValues = filters.status.map(val => val.split(',')).flat();
            if (statusValues.includes('closed')) {
                filteredCards = cards.filter(card => card.closed);
            } else if (statusValues.includes('open')) {
                filteredCards = cards.filter(card => !card.closed);
            }
        }

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            filteredCards = filteredCards.filter(card =>
                card.name.toLowerCase().includes(searchLower) ||
                card.desc?.toLowerCase().includes(searchLower)
            );
        }

        return filteredCards.map((card: any) => ({
            id: card.id,
            key: card.id,
            summary: card.name,
            description: card.desc || '',
            type: 'Card',
            status: card.closed ? 'Closed' : 'Open',
            priority: undefined,
            createdAt: new Date().toISOString(), // Fallback since Trello doesn't provide it easily here
            updatedAt: card.dateLastActivity || new Date().toISOString(),
            htmlUrl: card.url,
            labels: card.labels?.map((label: any) => label.name) || [],
            boardId: boardId,
        }));
    }

    async getIssue(issueId: string): Promise<UnifiedIssue> {
        const card = await this.request<any>(`/cards/${issueId}`);

        return {
            id: card.id,
            key: card.id,
            summary: card.name,
            description: card.desc || '',
            type: 'Card',
            status: card.closed ? 'Closed' : 'Open',
            priority: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: card.dateLastActivity || new Date().toISOString(),
            htmlUrl: card.url,
            labels: card.labels?.map((label: any) => label.name) || [],
            boardId: card.idBoard,
        };
    }

    async createIssue(boardId: string, params: CreateIssueParams): Promise<UnifiedIssue> {
        // We need a listId to create a card. We'll take the first list.
        const lists = await this.request<any[]>(`/boards/${boardId}/lists`);
        if (lists.length === 0) {
            throw new BoardProviderError('No lists found on Trello board', 'API_ERROR');
        }

        const card = await this.request<any>('/cards', {
            method: 'POST',
            body: JSON.stringify({
                name: params.summary,
                desc: params.description || '',
                idList: lists[0].id,
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        return this.getIssue(card.id);
    }

    async updateIssue(issueId: string, params: UpdateIssueParams): Promise<UnifiedIssue> {
        const body: any = {};
        if (params.summary) body.name = params.summary;
        if (params.description !== undefined) body.desc = params.description;

        await this.request(`/cards/${issueId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });

        return this.getIssue(issueId);
    }

    async deleteIssue(issueId: string): Promise<void> {
        await this.request(`/cards/${issueId}`, { method: 'DELETE' });
    }

    async getIssueTransitions(issueId: string): Promise<UnifiedTransition[]> {
        const card = await this.getIssue(issueId);
        const lists = await this.request<any[]>(`/boards/${card.boardId}/lists`);

        return lists.map((list: any) => ({
            id: list.id,
            name: list.name,
            to: {
                id: list.id,
                name: list.name,
            }
        }));
    }

    async transitionIssue(issueId: string, transitionId: string): Promise<void> {
        await this.request(`/cards/${issueId}`, {
            method: 'PUT',
            body: JSON.stringify({ idList: transitionId }),
            headers: { 'Content-Type': 'application/json' },
        });
    }

    async getWebhooks(boardId: string): Promise<UnifiedWebhook[]> {
        const webhooks = await this.request<any[]>(`/tokens/${this.apiToken}/webhooks`);
        return webhooks
            .filter((hook: any) => hook.idModel === boardId)
            .map((hook: any) => ({
                id: hook.id,
                url: hook.callbackURL,
                active: hook.active,
                events: ['*'],
                createdAt: '',
                contentType: 'json',
                insecureSsl: false,
            }));
    }

    async createWebhook(boardId: string, params: WebhookConfigParams): Promise<UnifiedWebhook> {
        const hook = await this.request<any>('/webhooks', {
            method: 'POST',
            body: JSON.stringify({
                idModel: boardId,
                callbackURL: params.url,
                description: 'Board Manager Webhook',
            }),
            headers: { 'Content-Type': 'application/json' },
        });

        return {
            id: hook.id,
            url: hook.callbackURL,
            active: hook.active,
            events: ['*'],
            createdAt: new Date().toISOString(),
            contentType: 'json',
            insecureSsl: false,
        };
    }

    async updateWebhook(boardId: string, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook> {
        const body: any = {};
        if (params.url) body.callbackURL = params.url;
        if (params.active !== undefined) body.active = params.active;

        const hook = await this.request<any>(`/webhooks/${hookId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' },
        });

        return {
            id: hook.id,
            url: hook.callbackURL,
            active: hook.active,
            events: ['*'],
            createdAt: '',
            contentType: 'json',
            insecureSsl: false,
        };
    }

    async deleteWebhook(boardId: string, hookId: string): Promise<void> {
        await this.request(`/webhooks/${hookId}`, { method: 'DELETE' });
    }

    async getActivity(boardId: string): Promise<UnifiedEvent[]> {
        const actions = await this.request<any[]>(`/boards/${boardId}/actions?limit=20`);

        return actions.map((action: any) => ({
            id: action.id,
            type: action.type,
            actor: {
                name: action.memberCreator?.fullName || 'Unknown',
                avatarUrl: action.memberCreator?.avatarUrl ? `${action.memberCreator.avatarUrl}/50.png` : '',
            },
            createdAt: action.date,
            description: action.data?.text || action.type,
            metadata: action.data,
        }));
    }

    // OAuth helper method (Trello uses a simple token flow usually)
    static getLoginUrl(state: string): string {
        const params = new URLSearchParams({
            callback_method: 'fragment',
            return_url: TRELLO_CALLBACK_URL,
            expiration: 'never',
            name: 'Board Manager',
            scope: 'read,write,account',
            response_type: 'token',
            key: TRELLO_API_KEY,
        });

        return `${TRELLO_AUTH_URL}?${params.toString()}`;
    }
}
