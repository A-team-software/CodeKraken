import { IGitProvider } from '../../domain/services/IGitProvider.interface';
import { UnifiedRepository, ProviderCapabilities } from '../../domain/types';
import { UnifiedWebhook, UnifiedDelivery, UnifiedEvent, WebhookConfigParams } from '@/lib/shared/types/providers';
import { GitProviderError } from '@/lib/shared/errors/provider.errors';
import { Logger } from '@/lib/infrastructure/logging/logger';
import { UserProps } from '@/lib/user';

export abstract class BaseGitProvider implements IGitProvider {
    abstract providerId: string;
    abstract capabilities: ProviderCapabilities;

    /**
     * Returns the base URL for the API (e.g., https://api.github.com)
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
                    throw new GitProviderError(`Invalid ${this.providerId} credentials.`, 'AUTH_FAILED', null, context);
                }
                if (response.status === 403) {
                    throw new GitProviderError('Permission Denied or Rate Limited.', 'PERMISSION_DENIED', null, context);
                }
                if (response.status === 404) {
                    throw new GitProviderError('Resource not found.', 'NOT_FOUND', null, context);
                }
                if (response.status === 422) {
                    const msg = errorData.message || errorData.error?.message || 'Validation Failed';
                    throw new GitProviderError(`Validation Failed: ${msg}`, 'VALIDATION', null, context);
                }

                const fallbackMsg = errorData.message || errorData.error || response.statusText;
                throw new GitProviderError(`${this.providerId} API Error: ${fallbackMsg}`, 'UNKNOWN', null, context);
            }

            return (await response.json()) as T;
        } catch (error) {
            if (error instanceof GitProviderError) throw error;

            Logger.error(`${this.providerId} Network/Unknown Error`, error, { url, method });
            throw new GitProviderError('Network connection failed', 'NETWORK', error, { url, method });
        }
    }

    // Abstract methods required by IGitProvider
    abstract authenticate(token?: string): Promise<boolean>;
    abstract getUser(): Promise<UserProps>;
    abstract getProviderAccountId(): Promise<string>;
    abstract getRepositories(page?: number, perPage?: number): Promise<UnifiedRepository[]>;
    abstract getWebhooks(repo: UnifiedRepository): Promise<UnifiedWebhook[]>;
    abstract createWebhook(repo: UnifiedRepository, params: WebhookConfigParams): Promise<UnifiedWebhook>;
    abstract updateWebhook(repo: UnifiedRepository, hookId: string, params: Partial<WebhookConfigParams>): Promise<UnifiedWebhook>;
    abstract deleteWebhook(repo: UnifiedRepository, hookId: string): Promise<void>;
    abstract getWebhookDeliveries(repo: UnifiedRepository, hookId: string): Promise<UnifiedDelivery[]>;
    abstract redeliverWebhook(repo: UnifiedRepository, hookId: string, deliveryId: string): Promise<void>;
    abstract pingWebhook(repo: UnifiedRepository, hookId: string): Promise<void>;
    abstract getEvents(repo: UnifiedRepository): Promise<UnifiedEvent[]>;
    abstract getLanguages(repo: UnifiedRepository): Promise<Record<string, number>>;
    abstract getProjectRoles(repo: UnifiedRepository): Promise<string[]>;
}
