import { ForgeSession } from "@oliver/core";

/**
 * Repository interface for Forge session management.
 * Forge sessions are short-lived (5 min), single-use tokens used to
 * securely pass Jira identity (accountId/cloudId) through the OAuth
 * redirect flow without exposing raw values in query params.
 */
export interface ForgeSessionRepository {
    /**
     * Create a new Forge session and return the opaque token.
     */
    create(accountId: string, cloudId: string, provider: string): Promise<string>;

    /**
     * Find a Forge session by its token value.
     * Returns null if not found or expired.
     */
    findByToken(token: string): Promise<ForgeSession | null>;

    /**
     * Delete a session (called immediately after reading — one-time use).
     */
    deleteByToken(token: string): Promise<void>;
}
