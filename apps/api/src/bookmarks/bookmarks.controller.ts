import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Bookmark } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { BookmarksService } from "./bookmarks.service.js";
import { BookmarkDto, CreateBookmarkRequestDto } from "./dto/bookmark.dto.js";

/** "Save for later" — the caller's own bookmarks in this workspace. */
@ApiTags("Bookmarks")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/bookmarks")
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  @RequirePermission("read", "Bookmark")
  @ApiOkResponse({ type: BookmarkDto, isArray: true })
  async list(@CurrentActor() actor: WorkspaceActor, @Query() query: PaginationQueryDto): Promise<PaginatedResult<Bookmark>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.bookmarks.list(actor, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Post()
  @RequirePermission("create", "Bookmark")
  @ApiCreatedResponse({ type: BookmarkDto })
  add(@CurrentActor() actor: WorkspaceActor, @Body() body: CreateBookmarkRequestDto): Promise<Bookmark> {
    return this.bookmarks.add(actor, body.messageId);
  }

  @Delete(":id")
  @RequirePermission("delete", "Bookmark")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(@CurrentActor() actor: WorkspaceActor, @Param("id") id: string): Promise<null> {
    await this.bookmarks.remove(actor, id);
    return null;
  }
}
