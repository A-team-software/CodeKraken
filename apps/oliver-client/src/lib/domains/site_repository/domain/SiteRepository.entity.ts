import { z } from 'zod';
import { AssignedRepo, AssignedRepoSchema, GitProvider, createAssignedRepo } from './AssignedRepo.vo';

// ------------------------------------------------------------------
// Zod schema (for persistence / reconstruction)
// ------------------------------------------------------------------
export const SiteRepositorySchema = z.object({
    /** Atlassian tenant identifier — unique Jira site ID */
    clientKey: z.string(),
    /** The base URL of the Jira site */
    siteUrl: z.string(),
    /** All repositories currently assigned to this site */
    repos: z.array(AssignedRepoSchema).default([]),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type SiteRepositoryProps = z.infer<typeof SiteRepositorySchema>;

// ------------------------------------------------------------------
// Aggregate root
// ------------------------------------------------------------------
export class SiteRepositoryAggregate {
    private readonly _clientKey: string;
    private readonly _siteUrl: string;
    private _repos: AssignedRepo[];

    private constructor(props: SiteRepositoryProps) {
        this._clientKey = props.clientKey;
        this._siteUrl = props.siteUrl;
        this._repos = props.repos ?? [];
    }

    // ---- Factory methods ----------------------------------------

    static create(clientKey: string, siteUrl: string): SiteRepositoryAggregate {
        return new SiteRepositoryAggregate({ clientKey, siteUrl, repos: [] });
    }

    static fromPersistence(props: SiteRepositoryProps): SiteRepositoryAggregate {
        const validated = SiteRepositorySchema.parse(props);
        return new SiteRepositoryAggregate(validated);
    }

    // ---- Getters ------------------------------------------------

    get clientKey(): string {
        return this._clientKey;
    }

    get siteUrl(): string {
        return this._siteUrl;
    }

    get repos(): ReadonlyArray<AssignedRepo> {
        return this._repos;
    }

    // ---- Business methods ----------------------------------------

    /**
     * Assign a repository to this site.
     * If already assigned (same repoId + provider), this is a no-op.
     */
    assignRepo(input: Omit<AssignedRepo, 'assignedAt'>): void {
        const alreadyAssigned = this._repos.some(
            (r) => r.repoId === input.repoId && r.provider === input.provider
        );

        if (alreadyAssigned) return;

        this._repos.push(createAssignedRepo(input));
    }

    /**
     * Remove a previously assigned repository.
     * Returns true if a repo was removed, false if it was not found.
     */
    removeRepo(repoId: string, provider: GitProvider): boolean {
        const before = this._repos.length;
        this._repos = this._repos.filter(
            (r) => !(r.repoId === repoId && r.provider === provider)
        );
        return this._repos.length < before;
    }

    // ---- Persistence snapshot -----------------------------------

    toPersistence(): SiteRepositoryProps {
        return {
            clientKey: this._clientKey,
            siteUrl: this._siteUrl,
            repos: [...this._repos],
        };
    }
}
