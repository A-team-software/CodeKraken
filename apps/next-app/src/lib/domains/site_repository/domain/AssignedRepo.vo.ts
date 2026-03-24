import { z } from 'zod';

// ------------------------------------------------------------------
// Zod schema
// ------------------------------------------------------------------
export const GitProviderEnum = z.enum(['github', 'bitbucket']);

export const AssignedRepoSchema = z.object({
    /** Provider-native canonical ID (GitHub: number-as-string, Bitbucket: UUID) */
    repoId: z.string(),
    /** Human-readable "owner/name" handle */
    repoFullName: z.string(),
    /** Which Git hosting provider this repo belongs to */
    provider: GitProviderEnum,
    /** URL to the repository's HTML page */
    htmlUrl: z.string().url(),
    /** Timestamp when the user assigned this repo to the site */
    assignedAt: z.date().default(() => new Date()),
});

// ------------------------------------------------------------------
// TypeScript types
// ------------------------------------------------------------------
export type AssignedRepo = z.infer<typeof AssignedRepoSchema>;
export type GitProvider = z.infer<typeof GitProviderEnum>;

// ------------------------------------------------------------------
// Factory helper
// ------------------------------------------------------------------
export function createAssignedRepo(
    input: Omit<AssignedRepo, 'assignedAt'> & { assignedAt?: Date }
): AssignedRepo {
    return AssignedRepoSchema.parse(input);
}
