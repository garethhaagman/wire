import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { API_VERSION } from "@wire/config";
import type { ApiError, ApiResponse } from "@wire/types";
import type { Response } from "express";
import type { RequestWithId } from "../middleware/request-id.middleware.js";
import { ApiException } from "../errors/api-exception.js";
import { errorCodeForStatus } from "../errors/http-status-error-code.map.js";

/**
 * Catches every thrown error and maps it to the universal error envelope —
 * internal-docs/api/errors.md. Nothing else in the app should build an error
 * response body directly.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<RequestWithId>();
    const requestId = req.requestId ?? "req_unknown";

    const { status, error } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    res.setHeader("X-API-Version", API_VERSION);

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error,
      meta: {
        request_id: requestId,
        api_version: API_VERSION,
      },
    };

    res.status(status).json(body);
  }

  private resolve(exception: unknown): { status: HttpStatus; error: ApiError } {
    if (exception instanceof ApiException) {
      return {
        status: exception.getStatus(),
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details ? { details: exception.details } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === "string"
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);

      return {
        status,
        error: {
          code: errorCodeForStatus(status),
          message: Array.isArray(message) ? message.join(" ") : message,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    };
  }
}
