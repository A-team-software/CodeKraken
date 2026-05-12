import { z } from 'zod';

export const ProviderTypeEnum = z.enum(['git', 'board']);
export type ProviderType = z.infer<typeof ProviderTypeEnum>;

export const OAuthTokenZodSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    /**
     * Optional Atlassian site identifier.
     * When present, this token belongs to a Jira site (clientKey)
     * and can be retrieved without needing a specific userId.
     */
    clientKey: z.string().nullish().transform(v => v ?? undefined),
    cloudId: z.string().nullish().transform(v => v ?? undefined),
    atlassianAccountId: z.string().nullish().transform(v => v ?? undefined),
    provider: z.string(),
    providerType: ProviderTypeEnum,
    accessToken: z.string().nullish().transform(v => v ?? undefined),
    refreshToken: z.string().nullish().transform(v => v ?? undefined),
    expiresAt: z.date().nullish().transform(v => v ?? undefined),
    tokenType: z.string().default('Bearer'),
    scope: z.string().nullish().transform(v => v ?? undefined),
    createdAt: z.date().nullish().transform(v => v ?? undefined),
    updatedAt: z.date().nullish().transform(v => v ?? undefined),
});

export type OAuthTokenProps = z.infer<typeof OAuthTokenZodSchema>;

