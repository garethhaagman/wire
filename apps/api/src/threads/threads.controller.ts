import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Message } from "@wire/types";
import { MarkReadRequestDto } from "../channels/dto/channel.dto.js";
import {
  CursorPaginatedResult,
  CursorQueryDto,
  decodeCursor,
} from "../common/dto/cursor-paginated-result.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import {
  CreateThreadReplyRequestDto,
  MessageDto,
  ThreadReadStateDto,
} from "../messages/dto/message.dto.js";
import { MessagesService } from "../messages/messages.service.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";

/**
 * Threads are a view over messages.thread_root_id, not a separate resource -
 * product/02-core-concepts.md § Thread. Reuses MessagesService.
 */
@ApiTags("Threads")
@ApiCookieAuth()
@WorkspaceScope({ from: "message", param: "threadRootId" })
@Controller("v1/threads/:threadRootId")
export class ThreadsController {
  constructor(private readonly messages: MessagesService) {}

  @Get("messages")
  @ApiOperation({
    operationId: "list_thread_replies",
    summary:
      "List the replies in a thread, newest first, or catch up after a seq",
  })
  @RequirePermission("read", "Thread")
  @ApiOkResponse({ type: MessageDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("threadRootId") threadRootId: string,
    @Query() query: CursorQueryDto
  ): Promise<CursorPaginatedResult<Message>> {
    const afterSeq = decodeCursor(query.cursor)?.seq ?? query.after_seq;
    const { items, cursor } = await this.messages.listThread(
      actor,
      threadRootId,
      afterSeq,
      query.per_page ?? 50
    );
    return new CursorPaginatedResult(items, cursor);
  }

  @Post("messages")
  @ApiOperation({
    operationId: "reply_in_thread",
    summary: "Post a reply in a thread",
  })
  @RequirePermission("create", "Thread")
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Replays the original response if the same key is sent again.",
  })
  @ApiCreatedResponse({ type: MessageDto })
  @UseInterceptors(IdempotencyInterceptor)
  reply(
    @CurrentActor() actor: WorkspaceActor,
    @Param("threadRootId") threadRootId: string,
    @Body() body: CreateThreadReplyRequestDto
  ): Promise<Message> {
    return this.messages.reply(
      actor,
      threadRootId,
      body.body,
      body.broadcastToChannel ?? false
    );
  }

  @Post("mark-read")
  @ApiOperation({
    operationId: "mark_thread_read",
    summary:
      "Advance the caller's read position in a thread up to a message seq",
  })
  @RequirePermission("update", "Thread")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ThreadReadStateDto })
  executeMarkRead(
    @CurrentActor() actor: WorkspaceActor,
    @Param("threadRootId") threadRootId: string,
    @Body() body: MarkReadRequestDto
  ): Promise<{ lastReadSeq: number }> {
    return this.messages.markThreadRead(actor, threadRootId, body.seq);
  }
}
