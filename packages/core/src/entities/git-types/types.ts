import { z } from "zod";

// ---------------------------------------------------------
// 1. Zod Schemas (Single Source of Truth for Types)
// ---------------------------------------------------------

export const GitProviderEnum = z.enum(['GITHUB', 'BITBUCKET', 'GITLAB']);


// ---------------------------------------------------------
// 2. TypeScript Interfaces (Inferred from Zod)
// ---------------------------------------------------------



// Schema for a connected Git Account (The mapping layer)
export const ConnectedAccountZodSchema = z.object({
    provider: GitProviderEnum,
    providerAccountId: z.string().describe("The ID returned by the provider (e.g. GitHub ID)"),
    username: z.string(),
    avatarUrl: z.string().url().nullish().transform(v => v ?? undefined),
    profileUrl: z.string().url().nullish().transform(v => v ?? undefined),
    accessToken: z.string().nullish().transform(v => v ?? undefined).describe("OAuth Access Token"),
    refreshToken: z.string().nullish().transform(v => v ?? undefined).describe("OAuth Refresh Token"),
    expiresAt: z.date().nullish().transform(v => v ?? undefined),
    email: z.string().email().nullish().transform(v => v ?? undefined).describe("Primary email on this specific provider account"),
});

export type ConnectedAccount = z.infer<typeof ConnectedAccountZodSchema>;

export type GitProvider = z.infer<typeof GitProviderEnum>;

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


// --- Zod Schemas ---
export const UserSchema = z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
    html_url: z.string(),
});

export const RepoSchema = z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    owner: UserSchema,
    description: z.string().nullable(),
    private: z.boolean(),
    html_url: z.string(),
    updated_at: z.string(),
    default_branch: z.string().optional().default('main'),
    language: z.string().nullable(),
    stargazers_count: z.number(),
    forks_count: z.number(),
    open_issues_count: z.number().optional(),
    watchers_count: z.number().optional(),
    permissions: z
        .object({
            admin: z.boolean(),
            push: z.boolean(),
            pull: z.boolean(),
        })
        .optional(),
});

export const WebhookSchema = z.object({
    id: z.number(),
    active: z.boolean(),
    events: z.array(z.string()),
    config: z.object({
        url: z.string(),
        content_type: z.string(),
        insecure_ssl: z.string(),
        secret: z.string().optional(),
    }),
    created_at: z.string(),
});



// Inferred TypeScript types from Zod schemas
export type UnifiedRepository = z.infer<typeof UnifiedRepositorySchema>;
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;
export type Repo = z.infer<typeof RepoSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;
