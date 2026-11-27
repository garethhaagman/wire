import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Bookmark } from "@wire/types";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { BookmarksService } from "./bookmarks.service.js";
import { BookmarkDto, CreateBookmarkRequestDto } from "./dto/bookmark.dto.js";

/** "Save for later": the caller's own bookmarks in this workspace. */
@ApiTags("Bookmarks")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/bookmarks")
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  @ApiOperation({
    operationId: "list_bookmarks",
    summary: "List the caller's saved-for-later messages in the workspace",
  })
  @RequirePermission("read", "Bookmark")
  @ApiOkResponse({ type: BookmarkDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<Bookmark>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.bookmarks.list(actor, page, perPage);
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  @Post()
  @ApiOperation({
    operationId: "add_bookmark",
    summary: "Save a message for later",
  })
  @RequirePermission("create", "Bookmark")
  @ApiCreatedResponse({ type: BookmarkDto })
  add(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: CreateBookmarkRequestDto
  ): Promise<Bookmark> {
    return this.bookmarks.add(actor, body.messageId);
  }

  @Delete(":id")
  @ApiOperation({
    operationId: "remove_bookmark",
    summary: "Remove a saved-for-later bookmark",
  })
  @RequirePermission("delete", "Bookmark")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<null> {
    await this.bookmarks.remove(actor, id);
    return null;
  }
}
