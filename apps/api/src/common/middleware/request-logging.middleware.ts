import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import { SpanStatusCode, trace } from "@wire/observability";
import type { NextFunction, Response } from "express";
import type { RequestWithId } from "./request-id.middleware.js";

/**
 * One access-log line per HTTP request after the response finishes (method path
 * status duration request_id). Middleware (not an interceptor) so guard failures
 * like 401 still log. Also stamps the active OTEL span with request_id / status.
 * Registered globally in AppModule, never add this per-controller.
 */
@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const start = Date.now();
    const { originalUrl, url, method, requestId } = req;
    const path = originalUrl || url;

    res.on("finish", () => {
      const { statusCode: status } = res;
      const ms = Date.now() - start;
      const id = requestId ? ` ${requestId}` : "";
      const line = `${method} ${path} ${status} ${ms}ms${id}`;

      const span = trace.getActiveSpan();
      if (span) {
        if (requestId) {
          span.setAttribute("http.request_id", requestId);
        }
        span.setAttribute("http.status_code", status);
        if (status >= 500) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: "http 5xx" });
        }
      }

      // Health checks stay at debug so info remains scannable in turbo.
      if (path === "/health" || path.startsWith("/health?")) {
        this.logger.debug(line);
        return;
      }

      if (status >= 500) {
        this.logger.error(line);
        return;
      }
      if (status >= 400) {
        this.logger.warn(line);
        return;
      }
      this.logger.log(line);
    });

    next();
  }
}
