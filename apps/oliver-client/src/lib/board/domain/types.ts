import { z } from 'zod';

// Zod Schemas
export const UnifiedBoardSchema = z.object({
    id: z.string(),
    name: z.string(),
    key: z.string(), // Project key (e.g., "PROJ")
    description: z.string().nullable(),
    type: z.string(), // e.g., "software", "business"
    htmlUrl: z.string(),
    avatarUrl: z.string().optional(),
    lead: z.object({
        name: z.string(),
        avatarUrl: z.string(),
    }).optional(),
    permissions: z.object({
        admin: z.boolean(),
        write: z.boolean(),
        read: z.boolean(),
    }),
});

export const UnifiedIssueSchema = z.object({
    id: z.string(),
    key: z.string(), // e.g., "PROJ-123"
    summary: z.string(),
    description: z.string().nullable(),
    type: z.string(), // e.g., "Task", "Bug", "Story"
    status: z.string(),
    priority: z.string().optional(),
    assignee: z.object({
        name: z.string(),
        avatarUrl: z.string(),
    }).optional(),
    reporter: z.object({
        name: z.string(),
        avatarUrl: z.string(),
    }).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    htmlUrl: z.string(),
    labels: z.array(z.string()),
    boardId: z.string(),
});

export const UnifiedTransitionSchema = z.object({
    id: z.string(),
    name: z.string(),
    to: z.object({
        id: z.string(),
        name: z.string(),
    }),
});

export const IssueFiltersSchema = z.object({
    status: z.array(z.string()).optional(),
    assignee: z.string().optional(),
    type: z.array(z.string()).optional(),
    labels: z.array(z.string()).optional(),
    search: z.string().optional(),
});

export const CreateIssueParamsSchema = z.object({
    summary: z.string(),
    description: z.string().optional(),
    type: z.string(),
    priority: z.string().optional(),
    assignee: z.string().optional(),
    labels: z.array(z.string()).optional(),
});

export const UpdateIssueParamsSchema = z.object({
    summary: z.string().optional(),
    description: z.string().optional(),
    priority: z.string().optional(),
    assignee: z.string().optional(),
    labels: z.array(z.string()).optional(),
});

export const BoardProviderCapabilitiesSchema = z.object({
    supportsWebhooks: z.boolean(),
    supportsTransitions: z.boolean(),
    supportsLabels: z.boolean(),
    supportsAssignees: z.boolean(),
    supportsPriorities: z.boolean(),
    supportsAttachments: z.boolean(),
    supportsComments: z.boolean(),
    supportsCustomFields: z.boolean(),
});

// Inferred TypeScript types from Zod schemas
export type UnifiedBoard = z.infer<typeof UnifiedBoardSchema>;
export type UnifiedIssue = z.infer<typeof UnifiedIssueSchema>;
export type UnifiedTransition = z.infer<typeof UnifiedTransitionSchema>;
export type IssueFilters = z.infer<typeof IssueFiltersSchema>;
export type CreateIssueParams = z.infer<typeof CreateIssueParamsSchema>;
export type UpdateIssueParams = z.infer<typeof UpdateIssueParamsSchema>;
export type BoardProviderCapabilities = z.infer<typeof BoardProviderCapabilitiesSchema>;
