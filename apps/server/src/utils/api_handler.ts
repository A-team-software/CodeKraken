import { NextRequest, NextResponse } from 'next/server';
import { ApiRes } from './api_response';
import { Logger } from '@oliver/core';
import { ApiError } from './api_error';
import { ApiErrorCode } from '@oliver/shared';
import { z } from 'zod';

export interface RouteOptions<
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny
> {
  bodySchema?: TBody;
  querySchema?: TQuery;
  paramsSchema?: TParams;
}

export interface RouteContext<
  TBody = any,
  TQuery = any,
  TParams = any
> {
  body: TBody;
  query: TQuery;
  params: TParams;
}

// Overload 1: with options
export function wrapRoute<
  TResult,
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny
>(
  options: RouteOptions<TBody, TQuery, TParams>,
  handler: (req: NextRequest, ctx: RouteContext<z.infer<TBody>, z.infer<TQuery>, z.infer<TParams>>) => Promise<TResult | NextResponse<any>>
): (req: NextRequest, context?: { params: Promise<any> | any }) => Promise<NextResponse<any>>;

// Overload 2: without options (backwards compatible)
export function wrapRoute<TResult>(
  handler: (req: NextRequest, params?: any) => Promise<TResult | NextResponse<any>>
): (req: NextRequest, context?: { params: Promise<any> | any }) => Promise<NextResponse<any>>;

/**
 * Higher-order function to wrap API routes with standardized error handling and validation.
 */
export function wrapRoute(arg1: any, arg2?: any): any {
  const hasOptions = typeof arg1 === 'object' && arg1 !== null;
  const options = hasOptions ? arg1 : undefined;
  const handler = hasOptions ? arg2 : arg1;

  return async (req: NextRequest, nextContext?: { params: Promise<any> | any }) => {
    try {
      let paramsData = nextContext?.params instanceof Promise ? await nextContext.params : nextContext?.params;

      if (!options) {
        // Backwards compatibility: just pass req and params
        const result = await handler(req, paramsData);
        if (result instanceof NextResponse) return result;
        return ApiRes.success(result);
      }

      // New declarative behavior
      let bodyData = {};
      let queryData = {};

      if (options.paramsSchema) {
        const parsed = options.paramsSchema.safeParse(paramsData);
        if (!parsed.success) {
          throw ApiError.badRequest('Invalid URL parameters', ApiErrorCode.VALIDATION_FAILED);
        }
        paramsData = parsed.data;
      }

      if (options.querySchema) {
        const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
        const parsed = options.querySchema.safeParse(searchParams);
        if (!parsed.success) {
          throw ApiError.badRequest('Invalid query parameters', ApiErrorCode.VALIDATION_FAILED);
        }
        queryData = parsed.data;
      }

      if (options.bodySchema) {
        let rawBody;
        try {
          rawBody = await req.json();
        } catch (err) {
          throw ApiError.badRequest('Invalid JSON payload', ApiErrorCode.BAD_REQUEST);
        }
        
        const parsed = options.bodySchema.safeParse(rawBody);
        if (!parsed.success) {
          throw ApiError.badRequest('Invalid request body', ApiErrorCode.VALIDATION_FAILED);
        }
        bodyData = parsed.data;
      }

      const result = await handler(req, {
        body: bodyData,
        query: queryData,
        params: paramsData,
      });

      if (result instanceof NextResponse) return result;
      return ApiRes.success(result);
    } catch (error: any) {
      Logger.error('API Route Error:', {
        path: req.nextUrl.pathname,
        message: error.message,
        stack: error.stack,
      });

      if (error instanceof ApiError) {
        return ApiRes.error(error.message, error.errorCode, error.statusCode);
      }

      if (error.status && typeof error.status === 'number') {
        return ApiRes.error(error.message, error.errorCode || ApiErrorCode.API_ERROR, error.status);
      }

      return ApiRes.error(
        error.message || 'An unexpected error occurred',
        ApiErrorCode.INTERNAL_ERROR,
        500
      );
    }
  };
}
