import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Reaction } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { ReactionsService } from "./reactions.service.js";
import { CreateReactionRequestDto, ReactionDto } from "./dto/reaction.dto.js";

@ApiTags("Reactions")
@ApiCookieAuth()
@Controller("v1/messages/:messageId/reactions")
export class ReactionsController {
  constructor(private readonly reactions: ReactionsService) {}

  @Get()
  @RequirePermission("read", "Reaction")
  @ApiOkResponse({ type: ReactionDto, isArray: true })
  list(@Param("messageId") messageId: string): Reaction[] {
    return this.reactions.list(messageId);
  }

  @Post()
  @RequirePermission("create", "Reaction")
  @ApiCreatedResponse({ type: ReactionDto })
  add(
    @Req() req: AuthedRequest,
    @Param("messageId") messageId: string,
    @Body() body: CreateReactionRequestDto,
  ): Reaction {
    const actorId = req.session!.user.id;
    return this.reactions.add(messageId, actorId, body.emoji);
  }

  @Delete()
  @RequirePermission("delete", "Reaction")
  @HttpCode(HttpStatus.OK)
  @ApiQuery({ name: "emoji", required: true })
  @ApiOkResponse({ schema: { type: "null" } })
  remove(
    @Req() req: AuthedRequest,
    @Param("messageId") messageId: string,
    @Query("emoji") emoji: string,
  ): null {
    const actorId = req.session!.user.id;
    this.reactions.remove(messageId, actorId, emoji);
    return null;
  }
}
