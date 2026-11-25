import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Message } from "@wire/types";
import {
  CursorPaginatedResult,
  CursorQueryDto,
  resolveCursor,
} from "../common/dto/cursor-paginated-result.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import {
  CreateMessageRequestDto,
  MessageDto,
  UpdateMessageRequestDto,
} from "./dto/message.dto.js";
import { MessagesService } from "./messages.service.js";

@ApiTags("Messages")
@ApiCookieAuth()
@WorkspaceScope({ from: "channel", param: "channelId" })
@Controller("v1/channels/:channelId/messages")
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /**
   * Keyset-paginated history: newest first by default; pass `after_seq` for an
   * oldest-first catch-up from a known position. Follow meta.cursor.next_cursor.
   */
  @Get()
  @RequirePermission("read", "Message")
  @ApiOkResponse({ type: MessageDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Query() query: CursorQueryDto
  ): Promise<CursorPaginatedResult<Message>> {
    const { items, cursor } = await this.messages.list(
      actor,
      channelId,
      resolveCursor(query),
      query.per_page ?? 50
    );
    return new CursorPaginatedResult(items, cursor);
  }

  @Get(":id")
  @RequirePermission("read", "Message")
  @ApiOkResponse({ type: MessageDto })
  getById(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Param("id") id: string
  ): Promise<Message> {
    return this.messages.getById(actor, channelId, id);
  }

  @Post()
  @RequirePermission("create", "Message")
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description:
      "Send a client-generated key so a retried post never creates a duplicate message.",
  })
  @ApiCreatedResponse({ type: MessageDto })
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Body() body: CreateMessageRequestDto
  ): Promise<Message> {
    return this.messages.post(actor, {
      channelId,
      body: body.body,
      threadRootId: body.threadRootId,
    });
  }

  @Patch(":id")
  @RequirePermission("update", "Message")
  @ApiOkResponse({ type: MessageDto })
  update(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Param("id") id: string,
    @Body() body: UpdateMessageRequestDto
  ): Promise<Message> {
    return this.messages.update(actor, channelId, id, body);
  }

  @Delete(":id")
  @RequirePermission("delete", "Message")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Param("id") id: string
  ): Promise<null> {
    await this.messages.remove(actor, channelId, id);
    return null;
  }
}
