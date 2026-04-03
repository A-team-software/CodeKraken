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
} from '@oliver/core';

import { BaseBoardProvider } from './BaseBoardProvider';

import { BoardProviderError } from '@oliver/shared';

const LINEAR_CLIENT_ID = process.env.NEXT_PUBLIC_LINEAR_CLIENT_ID || '';
const LINEAR_CLIENT_SECRET = process.env.LINEAR_CLIENT_SECRET || '';
const LINEAR_CALLBACK_URL = process.env.LINEAR_CALLBACK_URL || 'http://localhost:3000/api/boards/linear/callback';
const LINEAR_AUTH_URL = 'https://linear.app/oauth/authorize';
const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token';
const LINEAR_SCOPES = 'read,write,offlline_access';

import { UserProps } from '@oliver/core';

/**
 * Linear Service - Implements IBoardProvider for Linear
 * Uses Linear GraphQL API
 */
export class LinearService extends BaseBoardProvider {
    providerId = 'linear';
    capabilities: BoardProviderCapabilities = {
        supportsWebhooks: true,
        supportsTransitions: true,
        supportsLabels: true,
        supportsAssignees: true,
        supportsPriorities: true,
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
        return 'https://api.linear.app/graphql';
    }

    protected getAuthHeader(): Record<string, string> {
        return {
            'Authorization': this.token,
        };
    }

    private async graphqlRequest(query: string, variables?: any): Promise<any> {
        const result = await this.request<any>('', {
            method: 'POST',
            body: JSON.stringify({ query, variables }),
        });

        if (result.errors) {
            throw new BoardProviderError(
                `Linear API error: ${result.errors[0].message}`,
                'API_ERROR'
            );
        }

        return result.data;
    }

    async authenticate(token?: string): Promise<boolean> {
        if (token) this.token = token;
        try {
            const query = `
                query {
                    viewer {
                        id
                    }
                }
            `;

            await this.graphqlRequest(query);
            return true;
        } catch (error) {
            return false;
        }
    }

    async getUser(): Promise<UserProps> {
        const query = `
            query {
                viewer {
                    id
                    name
                    email
                    displayName
                    avatarUrl
                    url
                }
            }
        `;

        const data = await this.graphqlRequest(query);
        const user = data.viewer;

        return {
            name: user.displayName || user.name,
            username: user.displayName || user.name,
            email: user.email || '',
            image: user.avatarUrl || '',
            avatarUrl: user.avatarUrl || '',
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
        const query = `
            query($first: Int!) {
                projects(first: $first) {
                    nodes {
                        id
                        name
                        description
                        url
                        icon
                        lead {
                            name
                            avatarUrl
                        }
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query, { first: perPage });
        const projects = data.projects.nodes;

        return projects.map((project: any) => ({
            id: project.id,
            name: project.name,
            key: project.id,
            description: project.description || '',
            type: 'project',
            htmlUrl: project.url,
            avatarUrl: project.icon || '',
            lead: project.lead ? {
                name: project.lead.name,
                avatarUrl: project.lead.avatarUrl || '',
            } : undefined,
            permissions: {
                admin: true,
                write: true,
                read: true,
            },
        }));
    }

    async getBoard(boardId: string): Promise<UnifiedBoard> {
        const query = `
            query($id: String!) {
                project(id: $id) {
                    id
                    name
                    description
                    url
                    icon
                    lead {
                        name
                        avatarUrl
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query, { id: boardId });
        const project = data.project;

        return {
            id: project.id,
            name: project.name,
            key: project.id,
            description: project.description || '',
            type: 'project',
            htmlUrl: project.url,
            avatarUrl: project.icon || '',
            lead: project.lead ? {
                name: project.lead.name,
                avatarUrl: project.lead.avatarUrl || '',
            } : undefined,
            permissions: {
                admin: true,
                write: true,
                read: true,
            },
        };
    }

    async getIssues(boardId: string, filters?: IssueFilters): Promise<UnifiedIssue[]> {
        const query = `
            query($projectId: ID!, $first: Int!) {
                project(id: $projectId) {
                    issues(first: $first) {
                        nodes {
                            id
                            identifier
                            title
                            description
                            priority
                            state {
                                name
                            }
                            assignee {
                                name
                                avatarUrl
                            }
                            creator {
                                name
                                avatarUrl
                            }
                            createdAt
                            updatedAt
                            url
                            labels {
                                nodes {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query, {
            projectId: boardId,
            first: 100,
        });

        let issues = data.project.issues.nodes;

        // Apply filters
        if (filters?.status) {
            const statusValues = filters.status.map(val => val.split(',')).flat();
            issues = issues.filter((issue: any) =>
                statusValues.some(s => issue.state.name.toLowerCase().includes(s.toLowerCase()))
            );
        }

        if (filters?.search) {
            const searchLower = filters.search.toLowerCase();
            issues = issues.filter((issue: any) =>
                issue.title.toLowerCase().includes(searchLower) ||
                issue.description?.toLowerCase().includes(searchLower)
            );
        }

        return issues.map((issue: any) => ({
            id: issue.id,
            key: issue.identifier,
            summary: issue.title,
            description: issue.description || '',
            type: 'Issue',
            status: issue.state.name,
            priority: this.mapLinearPriority(issue.priority),
            assignee: issue.assignee ? {
                name: issue.assignee.name,
                avatarUrl: issue.assignee.avatarUrl || '',
            } : undefined,
            reporter: issue.creator ? {
                name: issue.creator.name,
                avatarUrl: issue.creator.avatarUrl || '',
            } : undefined,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            htmlUrl: issue.url,
            labels: issue.labels?.nodes?.map((label: any) => label.name) || [],
            boardId: boardId,
        }));
    }

    private mapLinearPriority(priority: number): string {
        switch (priority) {
            case 1: return 'Urgent';
            case 2: return 'High';
            case 3: return 'Medium';
            case 4: return 'Low';
            default: return 'None';
        }
    }

    async getIssue(issueId: string): Promise<UnifiedIssue> {
        const query = `
            query($id: String!) {
                issue(id: $id) {
                    id
                    identifier
                    title
                    description
                    priority
                    state {
                        name
                    }
                    assignee {
                        name
                        avatarUrl
                    }
                    creator {
                        name
                        avatarUrl
                    }
                    createdAt
                    updatedAt
                    url
                    labels {
                        nodes {
                            name
                        }
                    }
                    project {
                        id
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query, { id: issueId });
        const issue = data.issue;

        return {
            id: issue.id,
            key: issue.identifier,
            summary: issue.title,
            description: issue.description || '',
            type: 'Issue',
            status: issue.state.name,
            priority: this.mapLinearPriority(issue.priority),
            assignee: issue.assignee ? {
                name: issue.assignee.name,
                avatarUrl: issue.assignee.avatarUrl || '',
            } : undefined,
            reporter: issue.creator ? {
                name: issue.creator.name,
                avatarUrl: issue.creator.avatarUrl || '',
            } : undefined,
            createdAt: issue.createdAt,
            updatedAt: issue.updatedAt,
            htmlUrl: issue.url,
            labels: issue.labels?.nodes?.map((label: any) => label.name) || [],
            boardId: issue.project?.id || '',
        };
    }

    async createIssue(boardId: string, params: CreateIssueParams): Promise<UnifiedIssue> {
        const teamsQuery = `
            query {
                teams {
                    nodes {
                        id
                    }
                }
            }
        `;
        const teamsData = await this.graphqlRequest(teamsQuery);
        const teamId = teamsData.teams.nodes[0]?.id;

        if (!teamId) {
            throw new BoardProviderError('No teams found', 'API_ERROR');
        }

        const mutation = `
            mutation($input: IssueCreateInput!) {
                issueCreate(input: $input) {
                    success
                    issue {
                        id
                    }
                }
            }
        `;

        const input: any = {
            title: params.summary,
            description: params.description || '',
            teamId: teamId,
        };

        if (boardId) {
            input.projectId = boardId;
        }

        const data = await this.graphqlRequest(mutation, { input });

        if (!data.issueCreate.success) {
            throw new BoardProviderError('Failed to create Linear issue', 'API_ERROR');
        }

        return this.getIssue(data.issueCreate.issue.id);
    }

    async updateIssue(issueId: string, params: UpdateIssueParams): Promise<UnifiedIssue> {
        const mutation = `
            mutation($id: String!, $input: IssueUpdateInput!) {
                issueUpdate(id: $id, input: $input) {
                    success
                }
            }
        `;

        const input: any = {};
        if (params.summary) input.title = params.summary;
        if (params.description !== undefined) input.description = params.description;

        const data = await this.graphqlRequest(mutation, {
            id: issueId,
            input,
        });

        if (!data.issueUpdate.success) {
            throw new BoardProviderError('Failed to update Linear issue', 'API_ERROR');
        }

        return this.getIssue(issueId);
    }

    async deleteIssue(issueId: string): Promise<void> {
        const mutation = `
            mutation($id: String!) {
                issueDelete(id: $id) {
                    success
                }
            }
        `;

        const data = await this.graphqlRequest(mutation, { id: issueId });

        if (!data.issueDelete.success) {
            throw new BoardProviderError('Failed to delete Linear issue', 'API_ERROR');
        }
    }

    async getIssueTransitions(issueId: string): Promise<UnifiedTransition[]> {
        const query = `
            query($id: String!) {
                issue(id: $id) {
                    team {
                        states {
                            nodes {
                                id
                                name
                                type
                            }
                        }
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query, { id: issueId });
        const states = data.issue.team.states.nodes;

        return states.map((state: any) => ({
            id: state.id,
            name: state.name,
            to: {
                id: state.id,
                name: state.name,
            }
        }));
    }

    async transitionIssue(issueId: string, transitionId: string): Promise<void> {
        const mutation = `
            mutation($id: String!, $stateId: String!) {
                issueUpdate(id: $id, input: { stateId: $stateId }) {
                    success
                }
            }
        `;

        const data = await this.graphqlRequest(mutation, {
            id: issueId,
            stateId: transitionId,
        });

        if (!data.issueUpdate.success) {
            throw new BoardProviderError('Failed to transition Linear issue', 'API_ERROR');
        }
    }

    async getWebhooks(boardId: string): Promise<UnifiedWebhook[]> {
        const query = `
            query {
                webhooks {
                    nodes {
                        id
                        url
                        enabled
                        resourceTypes
                        createdAt
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query);
        const webhooks = data.webhooks.nodes;

        return webhooks.map((hook: any) => ({
            id: hook.id,
            url: hook.url,
            active: hook.enabled,
            events: hook.resourceTypes || ['*'],
            createdAt: hook.createdAt,
            contentType: 'json' as const,
            insecureSsl: false,
        }));
    }

    async createWebhook(boardId: string, params: WebhookConfigParams): Promise<UnifiedWebhook> {
        const mutation = `
            mutation($input: WebhookCreateInput!) {
                webhookCreate(input: $input) {
                    success
                    webhook {
                        id
                        url
                        enabled
                        resourceTypes
                        createdAt
                    }
                }
            }
        `;

        const input = {
            url: params.url,
            resourceTypes: params.events || ['Issue'],
        };

        const data = await this.graphqlRequest(mutation, { input });

        if (!data.webhookCreate.success) {
            throw new BoardProviderError('Failed to create Linear webhook', 'API_ERROR');
        }

        const hook = data.webhookCreate.webhook;

        return {
            id: hook.id,
            url: hook.url,
            active: hook.enabled,
            events: hook.resourceTypes || ['*'],
            createdAt: hook.createdAt || new Date().toISOString(),
            contentType: 'json',
            insecureSsl: false,
        };
    }

    async updateWebhook(boardId: string, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook> {
        const mutation = `
            mutation($id: String!, $input: WebhookUpdateInput!) {
                webhookUpdate(id: $id, input: $input) {
                    success
                    webhook {
                        id
                        url
                        enabled
                        resourceTypes
                        createdAt
                    }
                }
            }
        `;

        const input: any = {};
        if (params.url) input.url = params.url;
        if (params.active !== undefined) input.enabled = params.active;

        const data = await this.graphqlRequest(mutation, {
            id: hookId,
            input,
        });

        if (!data.webhookUpdate.success) {
            throw new BoardProviderError('Failed to update Linear webhook', 'API_ERROR');
        }

        const hook = data.webhookUpdate.webhook;

        return {
            id: hook.id,
            url: hook.url,
            active: hook.enabled,
            events: hook.resourceTypes || ['*'],
            createdAt: hook.createdAt || '',
            contentType: 'json',
            insecureSsl: false,
        };
    }

    async deleteWebhook(boardId: string, hookId: string): Promise<void> {
        const mutation = `
            mutation($id: String!) {
                webhookDelete(id: $id) {
                    success
                }
            }
        `;

        const data = await this.graphqlRequest(mutation, { id: hookId });

        if (!data.webhookDelete.success) {
            throw new BoardProviderError('Failed to delete Linear webhook', 'API_ERROR');
        }
    }

    async getActivity(boardId: string): Promise<UnifiedEvent[]> {
        const query = `
            query($projectId: ID!, $first: Int!) {
                project(id: $projectId) {
                    issues(first: $first) {
                        nodes {
                            comments {
                                nodes {
                                    id
                                    body
                                    createdAt
                                    user {
                                        name
                                        avatarUrl
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const data = await this.graphqlRequest(query, {
            projectId: boardId,
            first: 10,
        });

        const events: UnifiedEvent[] = [];

        data.project.issues.nodes.forEach((issue: any) => {
            issue.comments.nodes.forEach((comment: any) => {
                events.push({
                    id: comment.id,
                    type: 'comment',
                    actor: {
                        name: comment.user?.name || 'Unknown',
                        avatarUrl: comment.user?.avatarUrl || '',
                    },
                    createdAt: comment.createdAt,
                    description: comment.body,
                    metadata: {},
                });
            });
        });

        return events;
    }

    // OAuth helper methods
    static getLoginUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: LINEAR_CLIENT_ID,
            redirect_uri: LINEAR_CALLBACK_URL,
            response_type: 'code',
            scope: LINEAR_SCOPES,
            state: state,
            prompt: 'consent',
        });

        return `${LINEAR_AUTH_URL}?${params.toString()}`;
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
                client_id: LINEAR_CLIENT_ID,
                client_secret: LINEAR_CLIENT_SECRET,
                redirect_uri: LINEAR_CALLBACK_URL,
                code: code,
            });

            const response = await fetch(LINEAR_TOKEN_URL, {
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
                `Failed to exchange Linear code for token: ${error.message}`,
                'AUTH_FAILED'
            );
        }
    }
}
