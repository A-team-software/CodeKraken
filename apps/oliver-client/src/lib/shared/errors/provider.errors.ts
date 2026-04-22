export class ProviderError extends Error {
    public readonly context: Record<string, any>;

    constructor(
        message: string,
        public code: 'AUTH_FAILED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN' | 'API_ERROR' | 'NOT_SUPPORTED',
        public originalError?: any,
        context?: Record<string, any>
    ) {
        super(message);
        this.name = 'ProviderError';
        this.context = context || {};

        // Ensure prototype chain is preserved
        Object.setPrototypeOf(this, ProviderError.prototype);
    }
}

export class GitProviderError extends ProviderError {
    constructor(
        message: string,
        code: 'AUTH_FAILED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN' | 'API_ERROR' | 'NOT_SUPPORTED',
        originalError?: any,
        context?: Record<string, any>
    ) {
        super(message, code, originalError, context);
        this.name = 'GitProviderError';
        Object.setPrototypeOf(this, GitProviderError.prototype);
    }
}

export class BoardProviderError extends ProviderError {
    constructor(
        message: string,
        code: 'AUTH_FAILED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN' | 'API_ERROR' | 'NOT_SUPPORTED',
        originalError?: any,
        context?: Record<string, any>
    ) {
        super(message, code, originalError, context);
        this.name = 'BoardProviderError';
        Object.setPrototypeOf(this, BoardProviderError.prototype);
    }
}

export type ErrorCode = 'AUTH_FAILED' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN' | 'API_ERROR' | 'NOT_SUPPORTED';
