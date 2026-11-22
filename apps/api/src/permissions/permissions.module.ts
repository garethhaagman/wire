import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { MembersModule } from "../members/members.module.js";
import { SessionGuard } from "../auth/session.guard.js";
import { PermissionsGuard } from "./permissions.guard.js";
import { RoleResolverService } from "./role-resolver.service.js";

/**
 * Registers SessionGuard and PermissionsGuard as global APP_GUARDs, in that
 * order — global guards run in registration order (see
 * internal-docs/api/permissions.md), and PermissionsGuard depends on
 * req.session already being populated by SessionGuard. Both skip routes marked
 * @Public().
 */
@Module({
  imports: [MembersModule],
  providers: [
    RoleResolverService,
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class PermissionsModule {}
