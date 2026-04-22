import { OAuthState } from "../entities/oauth_state_entity";

/**
 * Repository interface for OAuth state management
 * Handles CSRF protection tokens for OAuth flows
 */
export interface OAuthStateRepository {
    /**
     * Create a new OAuth state token
     * @param state - The CSRF protection token
     * @param provider - The OAuth provider name (e.g., 'github', 'asana')
     * @param metadata - Optional metadata for the OAuth session
     */
    create(state: string, provider: string, metadata?: string): Promise<void>;

    /**
     * Find an OAuth state by its token value
     * @param state - The CSRF protection token to find
     * @returns The OAuth state if found, null otherwise
     */
    findByState(state: string): Promise<OAuthState | null>;

    /**
     * Delete an OAuth state by its token value
     * Used after validation to ensure one-time use
     * @param state - The CSRF protection token to delete
     */
    deleteByState(state: string): Promise<void>;
}
