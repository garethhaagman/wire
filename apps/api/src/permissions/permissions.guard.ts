import { CanActivate, ExecutionContext, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthedRequest } from "../auth/session.guard.js";
import { Public } from "../auth/public.decorator.js";
import { ApiException } from "../common/errors/api-exception.js";
import { defineAbilityFor } from "./ability.factory.js";
import { PermissionMetadata } from "./require-permission.decorator.js";
import { RoleResolverService } from "./role-resolver.service.js";

/**
 * Registered globally (app.module.ts), after SessionGuard, so req.session is
 * already populated. Reads the route's @RequirePermission metadata, resolves the
 * caller's role for this request, builds a CASL ability for that role, and checks
 * it. A route with no @RequirePermission (and not @Public()) is a configuration
 * bug, not an open route — see internal-docs/api/permissions.md; the lint rule is
 * the real enforcement, this guard fails closed as defense in depth.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly roleResolver: RoleResolverService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
    const email = req.session!.user.email;
    const role = this.roleResolver.resolve(req, email);
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
}
