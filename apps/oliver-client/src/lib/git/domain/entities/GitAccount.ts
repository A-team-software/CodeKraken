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
