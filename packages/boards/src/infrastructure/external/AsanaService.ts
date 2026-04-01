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
    UserProps,
    BoardProviderCapabilities,
} from '@oliver/core';

import { BaseBoardProvider } from './BaseBoardProvider';

import { BoardProviderError } from '@oliver/shared';

import {
    ASANA_CLIENT_ID,
    ASANA_CLIENT_SECRET,
    ASANA_CALLBACK_URL,
    ASANA_AUTH_URL,
    ASANA_TOKEN_URL,
    ASANA_SCOPES,
} from '@oliver/auth';

/**
 * Asana Service - Implements IBoardProvider for Asana
 * Uses Asana REST API v1.0
 */
export class AsanaService extends BaseBoardProvider {
    providerId = 'asana';
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

    private token: string;

    constructor(token: string) {
        super();
        this.token = token;
    }

    protected getBaseUrl(): string {
        return 'https://app.asana.com/api/1.0';
    }

    protected getAuthHeader(): Record<string, string> {
        return {
            'Authorization': `Bearer ${this.token}`,
        };
    }

    async authenticate(token?: string): Promise<boolean> {
        if (token) this.token = token;
        try {
            await this.request('/users/me');
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUser(): Promise<UserProps> {
        const result = await this.request<any>('/users/me');
        const data = result.data;

        return {
            name: data.name || data.email,
            username: data.name || data.email,
            email: data.email || '',
            image: data.photo?.image_128x128 || '',
            avatarUrl: data.photo?.image_128x128 || '',
            url: `https://app.asana.com/0/${data.gid}/list`,
            role: 'user',
            accounts: [],
            settings: {
                opencode: { model: 'llama3-70b-8192' }
            },
            onboardingStep: 'connect',
        };
    }

    async getBoards(page = 1, perPage = 30): Promise<UnifiedBoard[]> {
        const workspacesResult = await this.request<any>('/workspaces');
        const workspaces = workspacesResult.data;

        if (!workspaces || workspaces.length === 0) {
            return [];
        }

        const workspaceGid = workspaces[0].gid;
        const projectsResult = await this.request<any>(`/projects?workspace=${workspaceGid}&limit=${perPage}`);
        const projects = projectsResult.data;

        return projects.map((project: any) => ({
            id: project.gid,
            name: project.name,
            key: project.gid,
            description: project.notes || '',
            type: 'project',
            htmlUrl: project.permalink_url || `https://app.asana.com/0/${project.gid}`,
            avatarUrl: project.icon || '',
            lead: project.owner ? {
                name: project.owner.name,
                avatarUrl: '',
            } : undefined,
            permissions: {
                admin: true,
                write: true,
                read: true,
            },
        }));
    }

    async getBoard(boardId: string): Promise<UnifiedBoard> {
        const result = await this.request<any>(`/projects/${boardId}`);
        const project = result.data;

        return {
            id: project.gid,
            name: project.name,
            key: project.gid,
            description: project.notes || '',
            type: 'project',
            htmlUrl: project.permalink_url || `https://app.asana.com/0/${project.gid}`,
            avatarUrl: project.icon || '',
            lead: project.owner ? {
                name: project.owner.name,
                avatarUrl: '',
            } : undefined,
            permissions: {
                admin: true,
                write: true,
                read: true,
            },
        };
    }

    async getIssues(boardId: string, filters?: IssueFilters): Promise<UnifiedIssue[]> {
        let url = `/tasks?project=${boardId}&opt_fields=gid,name,notes,completed,assignee,assignee.name,created_at,modified_at,permalink_url,tags,tags.name`;

        const result = await this.request<any>(url);
        let tasks = result.data;

        // Apply filters
        if (filters?.status) {
            const isCompleted = filters.status.map(val => val.split(',')).flat().includes('complete');
            tasks = tasks.filter((task: any) => task.completed === isCompleted);
        }

        if (filters?.assignee) {
            tasks = tasks.filter((task: any) =>
                task.assignee?.gid === filters.assignee ||
                task.assignee?.email === filters.assignee
            );
        }

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            tasks = tasks.filter((task: any) =>
                task.name.toLowerCase().includes(searchLower) ||
                task.notes?.toLowerCase().includes(searchLower)
            );
        }

        return tasks.map((task: any) => ({
            id: task.gid,
            key: task.gid,
            summary: task.name,
            description: task.notes || '',
            type: 'Task',
            status: task.completed ? 'Completed' : 'Incomplete',
            priority: undefined,
            assignee: task.assignee ? {
                name: task.assignee.name,
                avatarUrl: '',
            } : undefined,
            reporter: undefined,
            createdAt: task.created_at,
            updatedAt: task.modified_at,
            htmlUrl: task.permalink_url || `https://app.asana.com/0/${task.gid}`,
            labels: task.tags?.map((tag: any) => tag.name) || [],
            boardId: boardId,
        }));
    }

    async getIssue(issueId: string): Promise<UnifiedIssue> {
        const result = await this.request<any>(`/tasks/${issueId}?opt_fields=gid,name,notes,completed,assignee,assignee.name,created_at,modified_at,permalink_url,tags,tags.name,projects,projects.gid`);
        const task = result.data;

        return {
            id: task.gid,
            key: task.gid,
            summary: task.name,
            description: task.notes || '',
            type: 'Task',
            status: task.completed ? 'Completed' : 'Incomplete',
            priority: undefined,
            assignee: task.assignee ? {
                name: task.assignee.name,
                avatarUrl: '',
            } : undefined,
            reporter: undefined,
            createdAt: task.created_at,
            updatedAt: task.modified_at,
            htmlUrl: task.permalink_url || `https://app.asana.com/0/${task.gid}`,
            labels: task.tags?.map((tag: any) => tag.name) || [],
            boardId: task.projects?.[0]?.gid || '',
        };
    }

    async createIssue(boardId: string, params: CreateIssueParams): Promise<UnifiedIssue> {
        const body = {
            data: {
                name: params.summary,
                notes: params.description || '',
                projects: [boardId],
            },
        };

        const result = await this.request<any>('/tasks', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return this.getIssue(result.data.gid);
    }

    async updateIssue(issueId: string, params: UpdateIssueParams): Promise<UnifiedIssue> {
        const body: any = { data: {} };
        if (params.summary) body.data.name = params.summary;
        if (params.description !== undefined) body.data.notes = params.description;

        await this.request(`/tasks/${issueId}`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });

        return this.getIssue(issueId);
    }

    async deleteIssue(issueId: string): Promise<void> {
        await this.request(`/tasks/${issueId}`, { method: 'DELETE' });
    }

    async getIssueTransitions(issueId: string): Promise<UnifiedTransition[]> {
        return [];
    }

    async transitionIssue(issueId: string, transitionId: string): Promise<void> {
        throw new BoardProviderError('Asana does not support transitions', 'NOT_SUPPORTED');
    }

    async getWebhooks(boardId: string): Promise<UnifiedWebhook[]> {
        const result = await this.request<any>(`/webhooks?workspace=${boardId}`);
        const webhooks = result.data;

        return webhooks.map((hook: any) => ({
            id: hook.gid,
            url: hook.target,
            active: hook.active,
            events: hook.filters?.map((f: any) => f.resource_type) || ['*'],
            createdAt: hook.created_at || '',
            contentType: 'json' as const,
            insecureSsl: false,
        }));
    }

    async createWebhook(boardId: string, params: WebhookConfigParams): Promise<UnifiedWebhook> {
        const body = {
            data: {
                resource: boardId,
                target: params.url,
                filters: params.events?.map(event => ({ resource_type: event })),
            },
        };

        const result = await this.request<any>('/webhooks', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const hook = result.data;

        return {
            id: hook.gid,
            url: hook.target,
            active: hook.active,
            events: hook.filters?.map((f: any) => f.resource_type) || ['*'],
            createdAt: hook.created_at || new Date().toISOString(),
            contentType: 'json',
            insecureSsl: false,
        };
    }

    async updateWebhook(boardId: string, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook> {
        throw new BoardProviderError('Asana webhooks cannot be updated', 'NOT_SUPPORTED');
    }

    async deleteWebhook(boardId: string, hookId: string): Promise<void> {
        await this.request(`/webhooks/${hookId}`, { method: 'DELETE' });
    }

    async getActivity(boardId: string): Promise<UnifiedEvent[]> {
        const tasksResult = await this.request<any>(`/tasks?project=${boardId}&limit=10`);
        const tasks = tasksResult.data;

        const events: UnifiedEvent[] = [];

        // Get stories for each task
        for (const task of tasks.slice(0, 5)) {
            const storiesResult = await this.request<any>(`/tasks/${task.gid}/stories?opt_fields=gid,type,text,created_at,created_by,created_by.name`);
            const stories = storiesResult.data;

            stories.forEach((story: any) => {
                events.push({
                    id: story.gid,
                    type: story.type,
                    actor: {
                        name: story.created_by?.name || 'Unknown',
                        avatarUrl: '',
                    },
                    createdAt: story.created_at,
                    description: story.text || story.type,
                    metadata: { taskGid: task.gid },
                });
            });
        }

        return events;
    }

    // OAuth helper methods
    static getLoginUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: ASANA_CLIENT_ID,
            redirect_uri: ASANA_CALLBACK_URL,
            response_type: 'code',
            state: state,
            scope: ASANA_SCOPES,
        });

        return `${ASANA_AUTH_URL}?${params.toString()}`;
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
                client_id: ASANA_CLIENT_ID,
                client_secret: ASANA_CLIENT_SECRET,
                redirect_uri: ASANA_CALLBACK_URL,
                code: code,
            });

            const response = await fetch(ASANA_TOKEN_URL, {
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
                `Failed to exchange Asana code for token: ${error.message}`,
                'AUTH_FAILED'
            );
        }
    }
}
