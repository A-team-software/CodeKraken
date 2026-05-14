import { z } from 'zod';

/**
 * Schema for Git connection status data.
 * Following FAANG-style API design: clear, type-safe, and consistent.
 */
export const GitStatusSchema = z.object({
  connected: z.boolean(),
  provider: z.string().optional(),
  scope: z.string().nullable().optional(),
});

export type GitStatusDTO = z.infer<typeof GitStatusSchema>;

/**
 * Standard error codes for Git-related operations
 */
export enum GitApiErrorCode {
  TOKEN_EXPIRED = 'GIT_TOKEN_EXPIRED',
  TOKEN_MISSING = 'GIT_TOKEN_MISSING',
  NOT_CONNECTED = 'GIT_NOT_CONNECTED',
  PROVIDER_ERROR = 'GIT_PROVIDER_ERROR',
}
