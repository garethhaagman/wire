import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Honors a client-supplied X-Request-ID for tracing across systems; otherwise mints
 * one. Echoed on every response per internal-docs/api/headers.md.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header("X-Request-ID");
    const requestId = incoming && incoming.length > 0 ? incoming : `req_${randomUUID()}`;
    (req as RequestWithId).requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  }
}
