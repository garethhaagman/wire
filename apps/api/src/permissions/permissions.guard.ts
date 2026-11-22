import { CanActivate, ExecutionContext, HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthedRequest } from "../auth/session.guard.js";
import { Public } from "../auth/public.decorator.js";
import { ApiException } from "../common/errors/api-exception.js";
import { defineAbilityFor } from "./ability.factory.js";
import { PermissionMetadata } from "./require-permission.decorator.js";
import { MemberResolverService } from "./member-resolver.service.js";
import { ScopeResolverService } from "./scope-resolver.service.js";
import { WorkspaceScope, type WorkspaceScopeSource } from "./workspace-scope.decorator.js";
import type { Role } from "./permission.types.js";

/**
 * Registered globally (app.module.ts), after SessionGuard, so req.session is
 * already populated. For workspace-scoped routes it resolves the workspace (from
 * `:workspaceId` or the route's @WorkspaceScope), requires an active membership,
 * and derives the CASL role from the member's role; then checks the route's
 * @RequirePermission. A route with no @RequirePermission (and not @Public()) is a
 * configuration bug, not an open route — see internal-docs/api/permissions.md; the
 * lint rule is the real enforcement, this guard fails closed as defense in depth.
 *
 * Non-members get 404, not 403, so workspace and channel ids can't be probed.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly scopes: ScopeResolverService,
    private readonly members: MemberResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.get(Public, context.getHandler())) {
      return true;
    }

    const required = this.reflector.get(PermissionMetadata, context.getHandler());

    if (!required) {
      this.logger.error(
        `${context.getClass().name}.${context.getHandler().name} has no @RequirePermission — denying by default`,
      );
      throw new ApiException(
        "INTERNAL_ERROR",
        "This endpoint is missing a required permission declaration.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const user = req.session!.user;
    const source = this.scopeSource(context, req);
    const workspaceId = source ? await this.scopes.resolve(source, req) : undefined;

    if (workspaceId === null) {
      throw new NotFoundException("The requested resource does not exist.");
    }

    let role: Role = "member";
    let member = null;
    if (workspaceId) {
      member = await this.members.resolve(workspaceId, {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
      });
      if (!member) {
        throw new NotFoundException("The requested resource does not exist.");
      }
      role = member.role === "owner" || member.role === "admin" ? "admin" : "member";
    }

    req.actor = {
      userId: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      workspaceId: workspaceId ?? null,
      member,
      role,
    };

    const ability = defineAbilityFor(role);
    if (!ability.can(required.action, required.subject)) {
      throw new ApiException(
        "PERMISSION_DENIED",
        `Role '${role}' cannot ${required.action} ${required.subject}.`,
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }

  private scopeSource(context: ExecutionContext, req: AuthedRequest): WorkspaceScopeSource | null {
    const declared = this.reflector.getAllAndOverride(WorkspaceScope, [context.getHandler(), context.getClass()]);
    if (declared) return declared;
    return req.params["workspaceId"] ? { from: "workspace", param: "workspaceId" } : null;
  }
}
