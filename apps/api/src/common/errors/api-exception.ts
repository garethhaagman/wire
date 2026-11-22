import { HttpException, HttpStatus } from "@nestjs/common";
import type { ApiErrorCode, ApiErrorDetail } from "@wire/types";

/**
 * Throw this when the default HTTP-status-to-error-code mapping
 * (http-status-error-code.map.ts) isn't precise enough — e.g. distinguishing
 * RESOURCE_CONFLICT from a generic 409, or attaching field-level details.
 * Prefer Nest's built-in exceptions (NotFoundException, etc.) when the default
 * mapping is already correct.
 */
export class ApiException extends HttpException {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    status: HttpStatus,
    public readonly details?: ApiErrorDetail[],
  ) {
    super(message, status);
  }
}

export class ValidationException extends ApiException {
  constructor(details: ApiErrorDetail[]) {
    super("VALIDATION_ERROR", "The request contains invalid fields.", HttpStatus.UNPROCESSABLE_ENTITY, details);
  }
}

export class ResourceConflictException extends ApiException {
  constructor(message: string) {
    super("RESOURCE_CONFLICT", message, HttpStatus.CONFLICT);
  }
}
