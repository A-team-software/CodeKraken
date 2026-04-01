import z from "zod";


export const UserJiraSiteAccessZodSchema = z.object({
    id: z.string().optional(),
    userId: z.string().describe('User identifier'),
    clientKey: z.string().describe('Jira site identifier (from Atlassian app installation)'),
    baseUrl: z.string().describe('Base URL of the Jira site'),
    scope: z.string().describe('OAuth scopes granted by the user'),
    // MongoDB may store undefined fields as null — nullish() accepts both and
    // the transform normalises null → undefined so downstream code is unaffected.
    expiresAt: z.date().nullish().transform(v => v ?? undefined).describe('When access expires, if applicable'),
    atlassianAccountId: z.string().nullish().transform(v => v ?? undefined).describe('Atlassian Account ID'),
    cloudId: z.string().nullish().transform(v => v ?? undefined).describe('Atlassian Cloud ID'),
    createdAt: z.date().nullish().transform(v => v ?? undefined),
    updatedAt: z.date().nullish().transform(v => v ?? undefined),
});


export const JiraUserSchema = z.object({
    accountId: z.string(),
    displayName: z.string(),
    avatarUrls: z
        .object({
            '48x48': z.string().optional(),
        })
        .optional(),
    emailAddress: z.string().optional(),
});



export type UserJiraSiteAccessProps = z.infer<typeof UserJiraSiteAccessZodSchema>;
