import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Message } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { MessagesService } from "../messages/messages.service.js";
import { CreateThreadReplyRequestDto, MessageDto } from "../messages/dto/message.dto.js";

/**
 * Threads are a view over messages.threadRootId, not a separate resource —
 * product/02-core-concepts.md § Thread. Reuses MessagesService rather than a
 * second in-memory store.
 */
@ApiTags("Threads")
@ApiCookieAuth()
@Controller("v1/threads/:threadRootId/messages")
export class ThreadsController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  @RequirePermission("read", "Thread")
  @ApiOkResponse({ type: MessageDto, isArray: true })
  list(
    @Param("threadRootId") threadRootId: string,
    @Query() query: PaginationQueryDto,
  ): PaginatedResult<Message> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.messages.listThread(threadRootId, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Post()
  @RequirePermission("create", "Thread")
  @ApiCreatedResponse({ type: MessageDto })
  reply(
    @Req() req: AuthedRequest,
    @Param("threadRootId") threadRootId: string,
    @Body() body: CreateThreadReplyRequestDto,
  ): Message {
    const actorId = req.session!.user.id;
    return this.messages.reply(threadRootId, actorId, body.body, body.broadcastToChannel ?? false);
  }
}
