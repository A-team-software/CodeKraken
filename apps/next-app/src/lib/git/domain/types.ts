import { z } from 'zod';

// Zod Schemas
export const UnifiedRepositorySchema = z.object({
    id: z.string(), // GitHub: number->string, Bitbucket: uuid
    name: z.string(),
    slug: z.string(), // URL friendly name
    owner: z.string(),
    fullName: z.string(), // owner/name
    description: z.string().nullable(),
    isPrivate: z.boolean(),
    htmlUrl: z.string(),
    language: z.string().nullable(),
    defaultBranch: z.string(),
    updatedAt: z.string(),
    stats: z.object({
        stars: z.number().optional(),
        forks: z.number().optional(),
        issues: z.number().optional(),
        watchers: z.number().optional(),
    }),
    permissions: z.object({
        admin: z.boolean(),
        push: z.boolean(),
        pull: z.boolean(),
    }),
});

export const ProviderCapabilitiesSchema = z.object({
    hasDeliveryHistory: z.boolean(),
    canPing: z.boolean(),
    canRedeliver: z.boolean(),
    supportsInsecureSsl: z.boolean(),
    supportsContentTypeConfiguration: z.boolean(),
    supportsWebhookSecrets: z.boolean(),
});

// Inferred TypeScript types from Zod schemas
export type UnifiedRepository = z.infer<typeof UnifiedRepositorySchema>;
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;
