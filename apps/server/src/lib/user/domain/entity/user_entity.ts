import { ConnectedAccountZodSchema } from '@/lib/git';
import { z } from 'zod';



// ─── Zod Schema (validation & serialization) ────────────────────

export const UserZodSchema = z.object({
    id: z.string().nullish().transform(v => v ?? undefined).optional(), // mapped from MongoDB _id
    name: z.string(),
    email: z.string().email(),
    image: z.url().optional(),
    role: z.string(),
    // A user can link multiple git providers (e.g. GitHub AND GitLab)
    accounts: z.array(ConnectedAccountZodSchema).default([]),
    // ── Provider profile fields (populated from board / git provider OAuth) ──
    username: z.string().nullish().transform(v => v ?? undefined).optional(),
    avatarUrl: z.string().nullish().transform(v => v ?? undefined).optional(),
    url: z.string().nullish().transform(v => v ?? undefined).optional(),
    createdAt: z.date().nullish().transform(v => v ?? undefined).optional(),
    updatedAt: z.date().nullish().transform(v => v ?? undefined).optional(),
    onboardingStep: z.enum(['none', 'connect', 'repos', 'assign', 'completed']).default('connect'),
    settings: z.object({
        opencode: z.object({
            groqApiKey: z.string().optional(),
            model: z.string().default('llama3-70b-8192'),
        }).default({ model: 'llama3-70b-8192' }),
    }).default({ opencode: { model: 'llama3-70b-8192' } }),
});

export type UserProps = z.infer<typeof UserZodSchema>;

