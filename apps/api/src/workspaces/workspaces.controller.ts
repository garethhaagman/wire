import { Body, Controller, Get, Param, Patch, Post, Query, UseInterceptors } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Workspace } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { CurrentUser, type RequestActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import { WorkspacesService } from "./workspaces.service.js";
import {
  CreateWorkspaceRequestDto,
  UpdateWorkspaceRequestDto,
  WorkspaceDto,
} from "./dto/workspace.dto.js";

/**
 * Skeleton-scope simplification: org_id is derived from the session user's id.
 * Real org/workspace tenancy per internal-docs/api/auth-tenancy.md (Organization -> Workspace)
 * is not implemented here — see internal-docs/data-model/data-model.md for the target shape.
 * Access to a single workspace is gated on membership by PermissionsGuard.
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
    @CurrentUser() actor: RequestActor,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<Workspace>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.workspaces.list(actor, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @WorkspaceScope({ from: "workspace", param: "id" })
  @RequirePermission("read", "Workspace")
  @ApiOkResponse({ type: WorkspaceDto })
  getById(@Param("id") id: string): Promise<Workspace> {
    return this.workspaces.getById(id);
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
  create(
    @CurrentUser() actor: RequestActor,
    @Body() body: CreateWorkspaceRequestDto,
  ): Promise<Workspace> {
    return this.workspaces.create(actor, body);
  }

  @Patch(":id")
  @WorkspaceScope({ from: "workspace", param: "id" })
  @RequirePermission("update", "Workspace")
  @ApiOkResponse({ type: WorkspaceDto })
  update(@Param("id") id: string, @Body() body: UpdateWorkspaceRequestDto): Promise<Workspace> {
    return this.workspaces.update(id, body);
  }
}
