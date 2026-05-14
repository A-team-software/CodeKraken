import { NextResponse } from 'next/server';
import { createSuccessPayload, createErrorPayload, ApiResponse } from '@oliver/shared';

/**
 * Server-side helpers for Next.js API responses
 * Enforced: Success must ONLY have data and code. Error must ONLY have message, errorCode, and code.
 */
export const ApiRes = {
  /**
   * Returns a standard success response
   */
  success<T>(data: T, status = 200, options?: { headers?: Record<string, string> }): NextResponse<ApiResponse<T>> {
    return NextResponse.json(createSuccessPayload(data, status), { 
      status, 
      headers: options?.headers 
    });
  },

  /**
   * Returns a standard error response
   */
  error(message: string, errorCode = 'INTERNAL_ERROR', status = 500): NextResponse<ApiResponse<never>> {
    return NextResponse.json(createErrorPayload(errorCode, message, status), { status });
  },

  /**
   * Returns a 400 Bad Request error
   */
  badRequest(message: string, errorCode = 'BAD_REQUEST') {
    return ApiRes.error(message, errorCode, 400);
  },

  /**
   * Returns a 401 Unauthorized error
   */
  unauthorized(message: string = 'Unauthorized', errorCode = 'UNAUTHORIZED') {
    return ApiRes.error(message, errorCode, 401);
  },

  /**
   * Returns a 403 Forbidden error
   */
  forbidden(message: string = 'Forbidden', errorCode = 'FORBIDDEN') {
    return ApiRes.error(message, errorCode, 403);
  },

  /**
   * Returns a 404 Not Found error
   */
  notFound(message: string = 'Not Found', errorCode = 'NOT_FOUND') {
    return ApiRes.error(message, errorCode, 404);
  }
};
