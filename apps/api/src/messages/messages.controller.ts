import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Message } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { MessagesService } from "./messages.service.js";
import { CreateMessageRequestDto, MessageDto } from "./dto/message.dto.js";

@ApiTags("Messages")
@ApiCookieAuth()
@Controller("v1/channels/:channelId/messages")
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @RequirePermission("read", "Message")
  @ApiOkResponse({ type: MessageDto, isArray: true })
  list(@Query() query: PaginationQueryDto): PaginatedResult<Message> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.messages.list(page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "Message")
  @ApiOkResponse({ type: MessageDto })
  getById(@Param("id") id: string): Message {
    return this.messages.getById(id);
  }

  @Post()
  @RequirePermission("create", "Message")
  @ApiCreatedResponse({ type: MessageDto })
  create(
    @Req() req: AuthedRequest,
    @Param("channelId") channelId: string,
    @Body() body: CreateMessageRequestDto,
  ): Message {
    const actorId = req.session!.user.id;
    return this.messages.create({ channelId, actorId, ...body });
  }
}
