import { GitProviderEnum } from '@oliver/core';
import { z } from 'zod';

// ------------------------------------------------------------------
// Zod schema
// ------------------------------------------------------------------

export const AssignRepoBodySchema = z.object({
    repoId: z.string(),
    repoFullName: z.string(),
    provider: z.enum(['GITHUB', 'BITBUCKET']),
    htmlUrl: z.string().url(),
});
// ------------------------------------------------------------------
// TypeScript types
// ------------------------------------------------------------------
export type AssignedRepo = z.infer<typeof AssignRepoBodySchema>;
export type GitProvider = z.infer<typeof GitProviderEnum>;

// ------------------------------------------------------------------
// Factory helper
// ------------------------------------------------------------------
export function createAssignedRepo(
    input: Omit<AssignedRepo, 'assignedAt'> & { assignedAt?: Date }
): AssignedRepo {
    return AssignRepoBodySchema.parse(input);
}
