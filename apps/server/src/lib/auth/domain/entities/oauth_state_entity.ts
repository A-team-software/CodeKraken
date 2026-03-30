import { z } from "zod";


// ---------------------------------------------------------
// 1. Zod Schema (Single Source of Truth for Types)
// ---------------------------------------------------------

export const OAuthStateZodSchema = z.object({
    id: z.string().optional(), // Mapped from MongoDB's _id
    state: z.string().describe("The CSRF protection token"),
    provider: z.string().describe("The OAuth provider name (e.g., 'github', 'asana')"),
    metadata: z.string().optional().describe("Additional metadata for the OAuth session"),
    createdAt: z.date().optional(),
    expiresAt: z.date().describe("When this state token expires"),
});

// --------------------------------------------
// 2. TypeScript Interfaces (Inferred from Zod)
// --------------------------------------------

export type OAuthState = z.infer<typeof OAuthStateZodSchema>;
