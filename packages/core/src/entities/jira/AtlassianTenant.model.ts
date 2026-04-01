import { z } from 'zod';

// ---------------------------------------------------------
// 1. Zod Schemas
// ---------------------------------------------------------

export const AtlassianTenantZodSchema = z.object({
    key: z.string().describe('App key from descriptor'),
    clientKey: z.string().describe('Unique identifier for the tenant instance'),
    sharedSecret: z.string().describe('Encrypted shared secret for signing requests'),
    baseUrl: z.string().describe('Base URL of the tenant instance'),
    productType: z.string().describe('Product type (jira, confluence)'),
    description: z.string().optional().describe('Tenant description'),
    eventType: z.string().optional().describe('Lifecycle event type (installed, etc.)'),
    cloudId: z.string().optional().describe('Atlassian Cloud ID for Forge apps'),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

// ---------------------------------------------------------
// 2. TypeScript Interfaces
// ---------------------------------------------------------

export type AtlassianTenant = z.infer<typeof AtlassianTenantZodSchema>;

// Interface for plain tenant data (decrypted)
export interface PlainAtlassianTenant extends Omit<AtlassianTenant, 'createdAt' | 'updatedAt'> {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
