import { ApiErrorCode } from '@oliver/shared';

/**
 * Standard API Error that can be thrown within route handlers.
 * The wrapRoute higher-order function explicitly catches these and formats them correctly.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: ApiErrorCode | string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, errorCode: ApiErrorCode | string = ApiErrorCode.BAD_REQUEST) {
    return new ApiError(400, errorCode, message);
  }

  static unauthorized(message: string = 'Unauthorized', errorCode: ApiErrorCode | string = ApiErrorCode.UNAUTHORIZED) {
    return new ApiError(401, errorCode, message);
  }

  static forbidden(message: string = 'Forbidden', errorCode: ApiErrorCode | string = ApiErrorCode.FORBIDDEN) {
    return new ApiError(403, errorCode, message);
  }

  static notFound(message: string = 'Not Found', errorCode: ApiErrorCode | string = ApiErrorCode.NOT_FOUND) {
    return new ApiError(404, errorCode, message);
  }

  static internal(message: string = 'An unexpected error occurred', errorCode: ApiErrorCode | string = ApiErrorCode.INTERNAL_ERROR) {
    return new ApiError(500, errorCode, message);
  }
}
