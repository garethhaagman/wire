import { HttpStatus } from "@nestjs/common";
import type { ApiErrorCode } from "@wire/types";

/**
 * Default mapping from HTTP status to a stable error code for exceptions that
 * don't carry an explicit ApiErrorCode (e.g. Nest's built-in NotFoundException).
 * See internal-docs/api/errors.md for the full status/code table.
 */
export const HTTP_STATUS_TO_ERROR_CODE: Partial<
  Record<HttpStatus, ApiErrorCode>
> = {
  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR",
  [HttpStatus.UNAUTHORIZED]: "AUTHENTICATION_ERROR",
  [HttpStatus.FORBIDDEN]: "PERMISSION_DENIED",
  [HttpStatus.NOT_FOUND]: "RESOURCE_NOT_FOUND",
  [HttpStatus.CONFLICT]: "RESOURCE_CONFLICT",
  [HttpStatus.UNPROCESSABLE_ENTITY]: "VALIDATION_ERROR",
  [HttpStatus.TOO_MANY_REQUESTS]: "RATE_LIMIT_EXCEEDED",
  [HttpStatus.SERVICE_UNAVAILABLE]: "SERVICE_UNAVAILABLE",
};

export function errorCodeForStatus(status: HttpStatus): ApiErrorCode {
  return HTTP_STATUS_TO_ERROR_CODE[status] ?? "INTERNAL_ERROR";
}
