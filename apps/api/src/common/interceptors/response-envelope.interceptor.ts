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

/**
 * Wraps every successful controller return value in the universal envelope
 * ({success, data, error, meta}) — see internal-docs/api/responses.md. Controllers
 * never build this themselves; they return plain data or a PaginatedResult.
 */
@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const req = http.getRequest<RequestWithId>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        res.setHeader("X-API-Version", API_VERSION);

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
