import {
    IBoardProvider,
} from '../../domain/services/IBoardProvider.interface';
import { UnifiedWebhook, UnifiedEvent, WebhookConfigParams } from '@/lib/shared/types/providers';
import { BoardProviderError } from '@/lib/shared/errors/provider.errors';
import { Logger } from '@/lib/infrastructure/logging/logger';
import {
    BoardProviderCapabilities,
    CreateIssueParams,
    IssueFilters,
    UnifiedBoard,
    UnifiedIssue,
    UnifiedTransition,
    UpdateIssueParams
} from '../../domain/types';
import { UserProps } from '@/lib/user';

export abstract class BaseBoardProvider implements IBoardProvider {
    abstract providerId: string;
    abstract capabilities: BoardProviderCapabilities;

    /**
     * Returns the base URL for the API
     */
    protected abstract getBaseUrl(): string;

    /**
     * Returns the authentication headers required for the request
     */
    protected abstract getAuthHeader(): Record<string, string>;

    /**
     * Optional hook for subclasses to handle specific error scenarios
     * before the default error handler kicks in.
     */
    protected async handleCustomError(response: Response, errorData: any, context: any): Promise<void> {
        // No-op by default
    }

    /**
     * Centralized Request Handler with Advanced Logging & Error Mapping
     */
    protected async request<T>(
        endpoint: string,
        options: RequestInit = {},
        customHeaders: Record<string, string> = {}
    ): Promise<T> {
        const url = `${this.getBaseUrl()}${endpoint}`;
        const method = options.method || 'GET';
        const startTime = performance.now();

        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...customHeaders,
            ...((options.headers as any) || {}),
        };

        try {
            Logger.debug(`${this.providerId} Request: ${method} ${endpoint}`, { method, endpoint });

            const response = await fetch(url, { ...options, headers });
            const duration = Math.round(performance.now() - startTime);

            Logger.info(`${this.providerId} Response: ${response.status} (${duration}ms)`, {
                method,
                endpoint,
                status: response.status,
            });

            if (response.status === 204) return {} as T;

            if (!response.ok) {
                let errorData: any = {};
                try {
                    errorData = await response.json();
                } catch {
                    /* ignore text body if json parse fails */
                }

                const context = {
                    url,
                    method,
                    status: response.status,
                    statusText: response.statusText,
                    responseBody: errorData,
                };

                // 1. Allow subclasses to handle specific errors first
                await this.handleCustomError(response, errorData, context);

                // 2. Default Error Handling
                if (response.status === 401) {
                    throw new BoardProviderError(`Invalid ${this.providerId} credentials.`, 'AUTH_FAILED', null, context);
                }
                if (response.status === 403) {
                    throw new BoardProviderError('Permission Denied or Rate Limited.', 'PERMISSION_DENIED', null, context);
                }
                if (response.status === 404) {
                    throw new BoardProviderError('Resource not found.', 'NOT_FOUND', null, context);
                }
                if (response.status === 422) {
                    const msg = errorData.message || errorData.error?.message || 'Validation Failed';
                    throw new BoardProviderError(`Validation Failed: ${msg}`, 'VALIDATION', null, context);
                }

                const fallbackMsg = errorData.message || errorData.error || response.statusText;
                throw new BoardProviderError(`${this.providerId} API Error: ${fallbackMsg}`, 'UNKNOWN', null, context);
            }

            return (await response.json()) as T;
        } catch (error) {
            if (error instanceof BoardProviderError) throw error;

            Logger.error(`${this.providerId} Network/Unknown Error`, error, { url, method });
            throw new BoardProviderError('Network connection failed', 'NETWORK', error, { url, method });
        }
    }

    // Abstract methods required by IBoardProvider
    abstract authenticate(token?: string): Promise<boolean>;
    abstract getUser(): Promise<UserProps>;
    abstract getBoards(page?: number, perPage?: number): Promise<UnifiedBoard[]>;
    abstract getBoard(boardId: string): Promise<UnifiedBoard>;
    abstract getIssues(boardId: string, filters?: IssueFilters): Promise<UnifiedIssue[]>;
    abstract getIssue(issueId: string): Promise<UnifiedIssue>;
    abstract createIssue(boardId: string, params: CreateIssueParams): Promise<UnifiedIssue>;
    abstract updateIssue(issueId: string, params: UpdateIssueParams): Promise<UnifiedIssue>;
    abstract deleteIssue(issueId: string): Promise<void>;
    abstract getIssueTransitions(issueId: string): Promise<UnifiedTransition[]>;
    abstract transitionIssue(issueId: string, transitionId: string): Promise<void>;
    abstract getWebhooks(boardId: string): Promise<UnifiedWebhook[]>;
    abstract createWebhook(boardId: string, params: WebhookConfigParams): Promise<UnifiedWebhook>;
    abstract updateWebhook(boardId: string, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook>;
    abstract deleteWebhook(boardId: string, hookId: string): Promise<void>;
    abstract getActivity(boardId: string): Promise<UnifiedEvent[]>;
}
