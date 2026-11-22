import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { API_VERSION } from "@wire/config";
import type { ApiResponse } from "@wire/types";
import type { Response } from "express";
import { map, type Observable } from "rxjs";
import type { RequestWithId } from "../middleware/request-id.middleware.js";
import { PaginatedResult } from "../dto/paginated-result.js";
import { CursorPaginatedResult } from "../dto/cursor-paginated-result.js";

/**
 * Wraps every successful controller return value in the universal envelope
 * ({success, data, error, meta}) — see internal-docs/api/responses.md. Controllers
 * never build this themselves; they return plain data, a PaginatedResult, or a
 * CursorPaginatedResult. Streaming handlers (SSE) write their own response, so
 * headers may already be sent by the time this runs.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        if (!res.headersSent) res.setHeader("X-API-Version", API_VERSION);

        if (payload instanceof PaginatedResult) {
          return {
            success: true,
            data: payload.items as unknown as T,
            error: null,
            meta: {
              request_id: req.requestId,
              api_version: API_VERSION,
              pagination: payload.pagination,
            },
          };
        }

        if (payload instanceof CursorPaginatedResult) {
          return {
            success: true,
            data: payload.items as unknown as T,
            error: null,
            meta: {
              request_id: req.requestId,
              api_version: API_VERSION,
              cursor: payload.cursor,
            },
          };
        }

        return {
          success: true,
          data: payload,
          error: null,
          meta: {
            request_id: req.requestId,
            api_version: API_VERSION,
          },
        };
      }),
    );
  }
}
