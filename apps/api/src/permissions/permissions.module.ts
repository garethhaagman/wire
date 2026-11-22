import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SessionGuard } from "../auth/session.guard.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { MemberResolverService } from "./member-resolver.service.js";
import { ScopeResolverService } from "./scope-resolver.service.js";

/**
 * Registers SessionGuard and PermissionsGuard as global APP_GUARDs, in that
 * order — global guards run in registration order (see
 * internal-docs/api/permissions.md), and PermissionsGuard depends on
 * req.session already being populated by SessionGuard. Both skip routes marked
 * @Public(). Global so services can invalidate cached memberships.
 */
@Global()
@Module({
  providers: [
    ScopeResolverService,
    MemberResolverService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
  exports: [MemberResolverService],
})
export class PermissionsModule {}
