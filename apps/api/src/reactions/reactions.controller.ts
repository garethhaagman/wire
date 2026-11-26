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
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { Reaction } from "@wire/types";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import {
  CreateReactionRequestDto,
  ReactionDto,
  RemoveReactionQueryDto,
} from "./dto/reaction.dto.js";
import { ReactionsService } from "./reactions.service.js";

@ApiTags("Reactions")
@ApiCookieAuth()
@WorkspaceScope({ from: "message", param: "messageId" })
@Controller("v1/messages/:messageId/reactions")
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  /** Individual reactions (capped at 1000): use Message.reactionCounts for totals. */
  @Get()
  @ApiOperation({
    operationId: "list_reactions",
    summary: "List the individual emoji reactions on a message",
  })
  @RequirePermission("read", "Reaction")
  @ApiOkResponse({ type: ReactionDto, isArray: true })
  list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("messageId") messageId: string
  ): Promise<Reaction[]> {
    return this.reactions.list(actor, messageId);
  }

  @Post()
  @ApiOperation({
    operationId: "add_reaction",
    summary: "Add an emoji reaction to a message",
  })
  @RequirePermission("create", "Reaction")
  @ApiCreatedResponse({ type: ReactionDto })
  add(
    @CurrentActor() actor: WorkspaceActor,
    @Param("messageId") messageId: string,
    @Body() body: CreateReactionRequestDto
  ): Promise<Reaction> {
    return this.reactions.add(actor, messageId, body.emoji);
  }

  @Delete()
  @ApiOperation({
    operationId: "remove_reaction",
    summary: "Remove the caller's emoji reaction from a message",
  })
  @RequirePermission("delete", "Reaction")
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: "emoji", required: true })
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("messageId") messageId: string,
    @Query() query: RemoveReactionQueryDto
  ): Promise<null> {
    await this.reactions.remove(actor, messageId, query.emoji);
    return null;
  }
}
