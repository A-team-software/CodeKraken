import { z } from 'zod';

// Zod Schemas
export const UnifiedWebhookSchema = z.object({
    id: z.string(),
    url: z.string(),
    active: z.boolean(),
    events: z.array(z.string()),
    createdAt: z.string(),
    contentType: z.enum(['json', 'form']),
    secret: z.string().optional(),
    insecureSsl: z.boolean().optional(),
});

export const UnifiedEventSchema = z.object({
    id: z.string(),
    type: z.string(),
    actor: z.object({
        name: z.string(),
        avatarUrl: z.string(),
    }),
    createdAt: z.string(),
    description: z.any(), // React.ReactNode
    metadata: z.record(z.string(), z.any()).optional(),
});

export const UnifiedDeliverySchema = z.object({
    id: z.string(),
    deliveredAt: z.string(),
    status: z.enum(['success', 'failure']),
    statusCode: z.number(),
    event: z.string(),
    duration: z.number().optional(),
});

export const WebhookConfigParamsSchema = z.object({
    url: z.string(),
    secret: z.string().optional(),
    contentType: z.enum(['json', 'form']).optional(),
    insecureSsl: z.boolean().optional(),
    events: z.array(z.string()),
    active: z.boolean(),
});

// Inferred TypeScript types from Zod schemas
export type UnifiedWebhook = z.infer<typeof UnifiedWebhookSchema>;
export type UnifiedEvent = z.infer<typeof UnifiedEventSchema>;
export type UnifiedDelivery = z.infer<typeof UnifiedDeliverySchema>;
export type WebhookConfigParams = z.infer<typeof WebhookConfigParamsSchema>;
