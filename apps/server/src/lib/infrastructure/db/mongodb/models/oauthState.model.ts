import { OAuthState } from '@/lib/auth/domain';
import { z } from 'zod';

export const OAuthStateZodSchema = z.object({
    id: z.string().optional(),
    state: z.string(),
    provider: z.string(),
    expiresAt: z.date(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
});

export type OAuthStateDocument = OAuthState & {
    createdAt: Date;
    expiresAt: Date;
};
