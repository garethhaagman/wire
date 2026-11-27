import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { Channel } from "@wire/types";
import type { Request } from "express";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import {
  PaginationQueryDto,
  parseFilterQuery,
} from "../common/dto/pagination-query.dto.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { ChannelsService } from "./channels.service.js";
import {
  ChannelDto,
  CreateChannelRequestDto,
  UpdateChannelRequestDto,
} from "./dto/channel.dto.js";

const CHANNEL_TYPES = new Set<Channel["type"]>([
  "public",
  "private",
  "dm",
  "group_dm",
]);

@ApiTags("Channels")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/channels")
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  /** The public directory plus every channel and conversation the caller belongs to. */
  @Get()
  @ApiOperation({
    operationId: "list_channels",
    summary:
      "List public channels plus every channel and conversation the caller belongs to",
  })
  @RequirePermission("read", "Channel")
  @ApiQuery({
    name: "filter[joined]",
    required: false,
    description: "true = only channels you belong to",
  })
  @ApiQuery({ name: "filter[type]", required: false, enum: [...CHANNEL_TYPES] })
  @ApiQuery({
    name: "filter[archived]",
    required: false,
    description: "true = include archived channels",
  })
  @ApiOkResponse({ type: ChannelDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: PaginationQueryDto,
    @Req() req: Request
  ): Promise<PaginatedResult<Channel>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const filter = parseFilterQuery(req.query);
    const type = CHANNEL_TYPES.has(filter.type as Channel["type"])
      ? (filter.type as Channel["type"])
      : undefined;
    const { items, total } = await this.channels.list(actor, {
      page,
      perPage,
      joinedOnly: filter.joined === "true",
      includeArchived: filter.archived === "true",
      type,
      search: query.search,
    });
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  @Get(":id")
  @ApiOperation({
    operationId: "get_channel",
    summary: "Get one channel's metadata",
  })
  @RequirePermission("read", "Channel")
  @ApiOkResponse({ type: ChannelDto })
  getById(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<Channel> {
    return this.channels.getById(actor, id);
  }

  @Post()
  @ApiOperation({ operationId: "create_channel", summary: "Create a channel" })
  @RequirePermission("create", "Channel")
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Replays the original response if the same key is sent again.",
  })
  @ApiCreatedResponse({ type: ChannelDto })
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: CreateChannelRequestDto
  ): Promise<Channel> {
    return this.channels.create(actor, body);
  }

  @Patch(":id")
  @ApiOperation({
    operationId: "update_channel",
    summary: "Update a channel's name, topic, or other metadata",
  })
  @RequirePermission("update", "Channel")
  @ApiOkResponse({ type: ChannelDto })
  update(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string,
    @Body() body: UpdateChannelRequestDto
  ): Promise<Channel> {
    return this.channels.update(actor, id, body);
  }

  /** Archiving is the channel's soft delete: admin-only, hence the "delete" permission. */
  @Post(":id/archive")
  @ApiOperation({
    operationId: "archive_channel",
    summary: "Archive a channel (admin only)",
  })
  @RequirePermission("delete", "Channel")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ChannelDto })
  executeArchive(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<Channel> {
    return this.channels.setArchived(actor, id, true);
  }

  @Post(":id/unarchive")
  @ApiOperation({
    operationId: "unarchive_channel",
    summary: "Unarchive a previously archived channel (admin only)",
  })
  @RequirePermission("delete", "Channel")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ChannelDto })
  executeUnarchive(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<Channel> {
    return this.channels.setArchived(actor, id, false);
  }
}
