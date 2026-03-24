import { z } from 'zod';

// ---------------------------------------------------------
// 1. Zod Schema
// ---------------------------------------------------------

export const UserJiraSiteAccessZodSchema = z.object({
    userId: z.string().describe('User identifier'),
    clientKey: z.string().describe('Jira site identifier (from Atlassian app installation)'),
    baseUrl: z.string().describe('Base URL of the Jira site'),
    scope: z.string().describe('OAuth scopes granted by the user'),
    expiresAt: z.date().optional().describe('When access expires, if applicable'),
    atlassianAccountId: z.string().optional().describe('Atlassian account identifier'),
    cloudId: z.string().optional().describe('Atlassian cloud identifier'),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

// ---------------------------------------------------------
// 2. TypeScript Interfaces
// ---------------------------------------------------------

export type UserJiraSiteAccess = z.infer<typeof UserJiraSiteAccessZodSchema>;

/**
 * Interface for plain user site access data
 */
export interface PlainUserJiraSiteAccess extends Omit<UserJiraSiteAccess, 'createdAt' | 'updatedAt'> {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * MongoDB document representation
 */
export interface UserJiraSiteAccessDocument {
    _id?: string;
    userId: string;
    clientKey: string;
    baseUrl: string;
    scope: string;
    expiresAt?: Date;
    atlassianAccountId?: string;
    cloudId?: string;
    createdAt: Date;
    updatedAt: Date;
}
