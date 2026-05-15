import { z } from 'zod';

export const ApiErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  API_ERROR: 'API_ERROR',
} as const;

export type ApiErrorCode = typeof ApiErrorCode[keyof typeof ApiErrorCode];

/**
 * Standard API Response Schema
 * Enforced: Success must ONLY have data and code. Error must ONLY have message, errorCode, and code.
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    z.object({
      data: dataSchema,
      code: z.number(),
    }),
    z.object({
      message: z.string(),
      errorCode: z.string(),
      code: z.number(),
    }),
  ]);

export type ApiResponse<T> =
  | { data: T; code: number }
  | { message: string; errorCode: ApiErrorCode | string; code: number };

/**
 * Helper to create a success response object
 */
export function createSuccessPayload<T>(data: T, code: number = 200): ApiResponse<T> {
  return {
    data,
    code,
  };
}

/**
 * Helper to create an error response object
 */
export function createErrorPayload(
  errorCode: ApiErrorCode | string,
  message: string,
  code: number = 500
): ApiResponse<never> {
  return {
    message,
    errorCode,
    code,
  };
}
