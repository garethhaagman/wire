import { createParamDecorator, type ExecutionContext, HttpStatus } from "@nestjs/common";
import { ApiException } from "../common/errors/api-exception.js";
import type { AuthedRequest } from "../auth/session.guard.js";
import type { ResolvedMember } from "./member-resolver.service.js";
import type { Role } from "./permission.types.js";

/** Who is making the request, as resolved by PermissionsGuard. */
export interface RequestActor {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  workspaceId: string | null;
  member: ResolvedMember | null;
  role: Role;
}

/** An actor on a workspace-scoped route — membership is guaranteed by the guard. */
export interface WorkspaceActor extends RequestActor {
  workspaceId: string;
  member: ResolvedMember;
}

function actorFrom(ctx: ExecutionContext): RequestActor {
  const actor = ctx.switchToHttp().getRequest<AuthedRequest>().actor;
  if (!actor) {
    throw new ApiException(
      "INTERNAL_ERROR",
      "Request actor was not resolved.",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
  return actor;
}

/** The caller on any authenticated route. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestActor => actorFrom(ctx),
);

/**
 * The caller on a workspace-scoped route. Using it on a route without a workspace
 * scope is a wiring bug and fails loudly rather than acting without tenancy.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceActor => {
    const actor = actorFrom(ctx);
    if (!actor.workspaceId || !actor.member) {
      throw new ApiException(
        "INTERNAL_ERROR",
        "This endpoint is missing a workspace scope declaration.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return actor as WorkspaceActor;
  },
);

export function isAdmin(actor: RequestActor): boolean {
  return actor.role === "admin";
}
