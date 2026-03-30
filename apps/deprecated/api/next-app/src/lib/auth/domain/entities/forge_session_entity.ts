import { z } from "zod";

// ---------------------------------------------------------
// 1. Zod Schema (Single Source of Truth for Types)
// ---------------------------------------------------------

export const ForgeSessionZodSchema = z.object({
    id: z.string().optional(), // Mapped from MongoDB's _id
    token: z.string().describe("Opaque one-time-use token (crypto random UUID)"),
    accountId: z.string().describe("Jira Atlassian account ID"),
    cloudId: z.string().describe("Jira cloud site ID"),
    provider: z.string().describe("Git provider (e.g. 'github', 'gitlab')"),
    createdAt: z.date().optional(),
    expiresAt: z.date().describe("When this session token expires (5 minutes)"),
});

// --------------------------------------------
// 2. TypeScript Interfaces (Inferred from Zod)
// --------------------------------------------

export type ForgeSession = z.infer<typeof ForgeSessionZodSchema>;
