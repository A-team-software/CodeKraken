import {
    UserProps,
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

/**
 * Interface for Board/Project Management providers (Jira, Trello, Asana, etc.)
 * Defines the contract for board management, issues, and project-specific operations
 */
export interface IBoardProvider {
    providerId: string;
    capabilities: BoardProviderCapabilities;

    // Auth & User
    authenticate(token?: string): Promise<boolean>;
    getUser(): Promise<UserProps>;

    // Boards/Projects
    getBoards(page?: number, perPage?: number): Promise<UnifiedBoard[]>;
    getBoard(boardId: string): Promise<UnifiedBoard>;

    // Issues/Cards
    getIssues(boardId: string, filters?: IssueFilters): Promise<UnifiedIssue[]>;
    getIssue(issueId: string): Promise<UnifiedIssue>;
    createIssue(boardId: string, params: CreateIssueParams): Promise<UnifiedIssue>;
    updateIssue(issueId: string, params: UpdateIssueParams): Promise<UnifiedIssue>;
    deleteIssue(issueId: string): Promise<void>;

    // Transitions/Workflows
    getIssueTransitions(issueId: string): Promise<UnifiedTransition[]>;
    transitionIssue(issueId: string, transitionId: string): Promise<void>;

    // Webhooks
    getWebhooks(boardId: string): Promise<UnifiedWebhook[]>;
    createWebhook(boardId: string, params: WebhookConfigParams): Promise<UnifiedWebhook>;
    updateWebhook(boardId: string, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook>;
    deleteWebhook(boardId: string, hookId: string): Promise<void>;

    // Activity/Events
    getActivity(boardId: string): Promise<UnifiedEvent[]>;
}
