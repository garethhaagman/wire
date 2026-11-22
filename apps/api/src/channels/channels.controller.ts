import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Channel } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { ChannelsService } from "./channels.service.js";
import { ChannelDto, CreateChannelRequestDto } from "./dto/channel.dto.js";

@ApiTags("Channels")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/channels")
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get()
  @RequirePermission("read", "Channel")
  @ApiOkResponse({ type: ChannelDto, isArray: true })
  list(@Query() query: PaginationQueryDto): PaginatedResult<Channel> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.channels.list(page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "Channel")
  @ApiOkResponse({ type: ChannelDto })
  getById(@Param("id") id: string): Channel {
    return this.channels.getById(id);
  }

  @Post()
  @RequirePermission("create", "Channel")
  @ApiCreatedResponse({ type: ChannelDto })
  create(
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateChannelRequestDto,
  ): Channel {
    return this.channels.create(workspaceId, body);
  }
}
