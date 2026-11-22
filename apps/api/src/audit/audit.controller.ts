import { Controller, Get, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuditEvent } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { AuditService } from "./audit.service.js";
import { AuditEventDto } from "./dto/audit-event.dto.js";

/**
 * Read-only. Any authenticated workspace member may read audit events (explicit
 * product decision, not a default) — see internal-docs/api/permissions.md and
 * internal-docs/api/auth-tenancy.md § Audit log. Events appear within ~500ms of
 * the request (buffered writes).
 */
@ApiTags("Audit")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/audit-events")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission("read", "AuditEvent")
  @ApiOkResponse({ type: AuditEventDto, isArray: true })
  async list(@CurrentActor() actor: WorkspaceActor, @Query() query: PaginationQueryDto): Promise<PaginatedResult<AuditEvent>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.audit.list(actor.workspaceId, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }
}
