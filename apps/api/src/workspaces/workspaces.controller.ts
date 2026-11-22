import { Body, Controller, Get, Param, Post, Query, Req, UseInterceptors } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Workspace } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspacesService } from "./workspaces.service.js";
import { CreateWorkspaceRequestDto, WorkspaceDto } from "./dto/workspace.dto.js";

/**
 * Skeleton-scope simplification: org_id is derived from the session user's id.
 * Real org/workspace tenancy per internal-docs/api/auth-tenancy.md (Organization -> Workspace)
 * is not implemented here — see internal-docs/data-model/data-model.md for the target shape.
 */
@ApiTags("Workspaces")
@ApiCookieAuth()
@Controller("v1/workspaces")
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  @RequirePermission("read", "Workspace")
  @ApiOkResponse({ type: WorkspaceDto, isArray: true })
  async list(
    @Req() req: AuthedRequest,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<Workspace>> {
    const orgId = req.session!.user.id;
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.workspaces.list(orgId, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "Workspace")
  @ApiOkResponse({ type: WorkspaceDto })
  async getById(@Req() req: AuthedRequest, @Param("id") id: string): Promise<Workspace> {
    const orgId = req.session!.user.id;
    return this.workspaces.getById(orgId, id);
  }

  @Post()
  @RequirePermission("create", "Workspace")
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Replays the original response if the same key is sent again.",
  })
  @ApiCreatedResponse({ type: WorkspaceDto })
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @Req() req: AuthedRequest,
    @Body() body: CreateWorkspaceRequestDto,
  ): Promise<Workspace> {
    const orgId = req.session!.user.id;
    return this.workspaces.create(orgId, body);
  }
}
