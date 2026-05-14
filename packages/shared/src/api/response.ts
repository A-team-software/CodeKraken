import { z } from 'zod';

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
  | { message: string; errorCode: string; code: number };

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
  errorCode: string,
  message: string,
  code: number = 500
): ApiResponse<never> {
  return {
    message,
    errorCode,
    code,
  };
}
