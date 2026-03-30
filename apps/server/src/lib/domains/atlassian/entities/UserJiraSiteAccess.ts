import { z } from 'zod';
import { AggregateRoot } from '@/lib/shared/events';

export const UserJiraSiteAccessZodSchema = z.object({
    id: z.string().optional(),
    userId: z.string().describe('User identifier'),
    clientKey: z.string().describe('Jira site identifier (from Atlassian app installation)'),
    baseUrl: z.string().describe('Base URL of the Jira site'),
    scope: z.string().describe('OAuth scopes granted by the user'),
    // MongoDB may store undefined fields as null — nullish() accepts both and
    // the transform normalises null → undefined so downstream code is unaffected.
    expiresAt: z.date().nullish().transform(v => v ?? undefined).describe('When access expires, if applicable'),
    atlassianAccountId: z.string().nullish().transform(v => v ?? undefined).describe('Atlassian Account ID'),
    cloudId: z.string().nullish().transform(v => v ?? undefined).describe('Atlassian Cloud ID'),
    createdAt: z.date().nullish().transform(v => v ?? undefined),
    updatedAt: z.date().nullish().transform(v => v ?? undefined),
});

export type UserJiraSiteAccessProps = z.infer<typeof UserJiraSiteAccessZodSchema>;

/**
 * Aggregate root for User-to-Jira-Site access mapping.
 * Tracks which users have access to which Jira sites and what permissions they granted.
 */
export class UserJiraSiteAccessAggregate extends AggregateRoot {
    private props: UserJiraSiteAccessProps;

    private constructor(props: UserJiraSiteAccessProps) {
        super();
        this.props = props;
    }

    static create(
        props: Omit<UserJiraSiteAccessProps, 'id' | 'createdAt' | 'updatedAt'>,
        id?: string
    ): UserJiraSiteAccessAggregate {
        const now = new Date();
        const validated = UserJiraSiteAccessZodSchema.parse({
            ...props,
            id,
            createdAt: now,
            updatedAt: now,
        });

        return new UserJiraSiteAccessAggregate(validated);
    }

    static fromPersistence(props: UserJiraSiteAccessProps): UserJiraSiteAccessAggregate {
        const validated = UserJiraSiteAccessZodSchema.parse(props);
        return new UserJiraSiteAccessAggregate(validated);
    }

    get id(): string | undefined {
        return this.props.id;
    }

    get userId(): string {
        return this.props.userId;
    }

    get clientKey(): string {
        return this.props.clientKey;
    }

    get baseUrl(): string {
        return this.props.baseUrl;
    }

    get scope(): string {
        return this.props.scope;
    }

    get expiresAt(): Date | undefined {
        return this.props.expiresAt;
    }

    get createdAt(): Date | undefined {
        return this.props.createdAt;
    }

    get updatedAt(): Date | undefined {
        return this.props.updatedAt;
    }

    get atlassianAccountId(): string | undefined {
        return this.props.atlassianAccountId;
    }

    get cloudId(): string | undefined {
        return this.props.cloudId;
    }

    /**
     * Check if the access is still valid (not expired)
     */
    isValid(): boolean {
        if (!this.props.expiresAt) {
            return true; // No expiry means it's always valid
        }
        return new Date() < this.props.expiresAt;
    }

    /**
     * Check if user has a specific scope
     */
    hasScope(requiredScope: string): boolean {
        const scopes = this.props.scope.split(' ');
        return scopes.includes(requiredScope);
    }

    /**
     * Check if user has all required scopes
     */
    hasScopeSet(requiredScopes: string[]): boolean {
        const userScopes = this.props.scope.split(' ');
        return requiredScopes.every(scope => userScopes.includes(scope));
    }

    /**
     * Update the scope (e.g., when user grants more permissions)
     */
    updateScope(newScope: string): void {
        this.props.scope = newScope;
        this.props.updatedAt = new Date();
    }

    toPersistence(): UserJiraSiteAccessProps {
        return { ...this.props };
    }
}
