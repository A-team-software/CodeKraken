import { UserJiraSiteAccessRepository } from '@oliver/domains';
import { Logger } from '@oliver/core';

export interface ValidateUserSiteAccessCommand {
    userId: string;
    clientKey: string;
    requiredScopes?: string[];
}

export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    hasScopes?: boolean;
}

/**
 * Use case: Validate if a user has access to a specific Jira site
 * Optionally validate that user has required scopes
 */
export class ValidateUserSiteAccessUseCase {
    constructor(private accessRepo: UserJiraSiteAccessRepository) { }

    async execute(cmd: ValidateUserSiteAccessCommand): Promise<ValidationResult> {
        const { userId, clientKey, requiredScopes } = cmd;

        try {
            const access = await this.accessRepo.findByUserAndSite(userId, clientKey);

            if (!access) {
                Logger.warn('User has no access to site', { userId, clientKey });
                return {
                    isValid: false,
                    reason: 'User has no access to this Jira site'
                };
            }

            if (!access.isValid()) {
                Logger.warn('User site access expired', { userId, clientKey, expiresAt: access.expiresAt });
                return {
                    isValid: false,
                    reason: 'Access has expired'
                };
            }

            if (requiredScopes && requiredScopes.length > 0) {
                const hasScopes = access.hasScopeSet(requiredScopes);
                if (!hasScopes) {
                    Logger.warn('User lacks required scopes', { userId, clientKey, requiredScopes, userScopes: access.scope });
                    return {
                        isValid: false,
                        hasScopes: false,
                        reason: `User lacks required scopes: ${requiredScopes.join(', ')}`
                    };
                }
                return { isValid: true, hasScopes: true };
            }

            return { isValid: true };
        } catch (error) {
            Logger.error('Error validating user site access', { userId, clientKey, error });
            throw error;
        }
    }
}
