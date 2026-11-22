import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { WireFile } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import { FilesService } from "./files.service.js";
import { CreateFileRequestDto, FileDto } from "./dto/file.dto.js";

/**
 * Metadata only — no real upload/storage backend yet. A real implementation
 * needs a signed-upload-URL flow, not a single multipart POST; see
 * internal-docs/product/02-core-concepts.md § File.
 */
@ApiTags("Files")
@ApiCookieAuth()
@Controller("v1")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get("files/:id")
  @WorkspaceScope({ from: "file", param: "id" })
  @RequirePermission("read", "File")
  @ApiOkResponse({ type: FileDto })
  getById(@CurrentActor() actor: WorkspaceActor, @Param("id") id: string): Promise<WireFile> {
    return this.files.getById(actor, id);
  }

  @Post("files")
  @WorkspaceScope({ from: "bodyChannel", field: "channelId" })
  @RequirePermission("create", "File")
  @ApiCreatedResponse({ type: FileDto })
  create(@CurrentActor() actor: WorkspaceActor, @Body() body: CreateFileRequestDto): Promise<WireFile> {
    return this.files.create(actor, body);
  }

  @Get("channels/:channelId/files")
  @WorkspaceScope({ from: "channel", param: "channelId" })
  @RequirePermission("read", "File")
  @ApiOkResponse({ type: FileDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<WireFile>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.files.listForChannel(actor, channelId, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }
}
