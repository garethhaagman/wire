import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { type Observable, tap } from "rxjs";
import type { AuthedRequest } from "../auth/session.guard.js";
import type { RequestWithId } from "../common/middleware/request-id.middleware.js";
import { PermissionMetadata } from "../permissions/require-permission.decorator.js";
import { AuditService } from "./audit.service.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** Ephemeral signals, not changes worth an audit row. */
const UNAUDITED_SUBJECTS = new Set(["Presence"]);

/**
 * Records every successful mutating request on a workspace-scoped route —
 * interceptor-level so no handler can forget to (internal-docs/api/auth-tenancy.md
 * § Audit log). Resource and action come from the route's @RequirePermission; the
 * resource id from the response body's `id`, else the route's own id param.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthedRequest & RequestWithId>();
    const permission = this.reflector.get(PermissionMetadata, context.getHandler());
    if (!MUTATING.has(req.method) || !permission || UNAUDITED_SUBJECTS.has(permission.subject)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((body: unknown) => {
        const actor = req.actor;
        if (!actor?.workspaceId || !actor.member) return;
        this.audit.record({
          workspaceId: actor.workspaceId,
          actorId: actor.member.id,
          ip: req.ip ?? null,
          resource: permission.subject,
          resourceId: resourceIdOf(body, req.params),
          action: `${permission.action}:${context.getHandler().name}`,
          requestId: req.requestId?.slice(0, 128) ?? null,
        });
      }),
    );
  }
}

function resourceIdOf(body: unknown, params: Record<string, string | string[]>): string | null {
  if (body && typeof body === "object" && "id" in body && typeof body.id === "string") return body.id;
  const last = Object.values(params).at(-1);
  return typeof last === "string" ? last : null;
}
