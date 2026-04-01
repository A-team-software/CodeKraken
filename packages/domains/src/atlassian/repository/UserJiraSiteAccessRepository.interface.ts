import { UserJiraSiteAccessAggregate } from '../entities/UserJiraSiteAccess';

export interface UserJiraSiteAccessRepository {
    /**
     * Save or update a user's access to a Jira site
     */
    save(access: UserJiraSiteAccessAggregate): Promise<UserJiraSiteAccessAggregate>;

    /**
     * Find a user's access to a specific Jira site
     */
    findByUserAndSite(userId: string, clientKey: string): Promise<UserJiraSiteAccessAggregate | null>;

    /**
     * Find all Jira sites a user has access to
     */
    findByUser(userId: string): Promise<UserJiraSiteAccessAggregate[]>;

    /**
     * Find all users with access to a specific Jira site
     */
    findBySite(clientKey: string): Promise<UserJiraSiteAccessAggregate[]>;

    /**
     * Remove a user's access to a Jira site
     */
    deleteByUserAndSite(userId: string, clientKey: string): Promise<boolean>;

    /**
     * Remove all access records for a user
     */
    deleteAllByUser(userId: string): Promise<number>;

    /**
     * Remove all access records for a Jira site
     */
    deleteAllBySite(clientKey: string): Promise<number>;

    /**
     * Find expired access records
     */
    findExpired(): Promise<UserJiraSiteAccessAggregate[]>;

    /**
     * Find a user's access by Atlassian account ID
     */
    findByAtlassianAccountId(accountId: string): Promise<UserJiraSiteAccessAggregate | null>;

    /**
     * Find access by Jira site clientKey and Atlassian account ID
     */
    findByClientKeyAndAccountId(clientKey: string, accountId: string): Promise<UserJiraSiteAccessAggregate | null>;
}
