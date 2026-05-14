import { NextRequest, NextResponse } from 'next/server';
import { ApiRes } from './api_response';
import { Logger } from '@oliver/core';

type ApiHandler<T> = (
  req: NextRequest,
  params?: any
) => Promise<T | NextResponse<any>>;

/**
 * Higher-order function to wrap API routes with standardized error handling.
 * Eliminates boilerplate try/catch blocks and ensures consistent ApiResponse format.
 */
export function wrapRoute<T>(handler: ApiHandler<T>) {
  return async (req: NextRequest, context?: { params: any }) => {
    try {
      const result = await handler(req, context?.params);

      // If the handler already returns a NextResponse, use it
      if (result instanceof NextResponse) {
        return result;
      }

      // Otherwise, wrap the result in a standard success response
      return ApiRes.success(result);
    } catch (error: any) {
      Logger.error('API Route Error:', {
        path: req.nextUrl.pathname,
        message: error.message,
        stack: error.stack,
      });

      // Handle specific error types if needed
      if (error.status && typeof error.status === 'number') {
        return ApiRes.error(error.message, error.errorCode || 'API_ERROR', error.status);
      }

      return ApiRes.error(
        error.message || 'An unexpected error occurred',
        'INTERNAL_SERVER_ERROR',
        500
      );
    }
  };
}
