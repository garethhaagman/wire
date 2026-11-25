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
  ApiTags,
} from "@nestjs/swagger";
import type { ChannelMember } from "@wire/types";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import { ChannelsService } from "./channels.service.js";
import {
  AddChannelMemberRequestDto,
  ChannelMemberDto,
  MarkReadRequestDto,
} from "./dto/channel.dto.js";

@ApiTags("Channel members")
@ApiCookieAuth()
@WorkspaceScope({ from: "channel", param: "channelId" })
@Controller("v1/channels/:channelId")
export class ChannelMembersController {
  constructor(private readonly channels: ChannelsService) {}

  @Get("members")
  @RequirePermission("read", "ChannelMember")
  @ApiOkResponse({ type: ChannelMemberDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<ChannelMember>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.channels.listMembers(
      actor,
      channelId,
      page,
      perPage
    );
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  /** Join (pass your own member id) or add someone else. Idempotent. */
  @Post("members")
  @RequirePermission("create", "ChannelMember")
  @ApiCreatedResponse({ type: ChannelMemberDto })
  add(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Body() body: AddChannelMemberRequestDto
  ): Promise<ChannelMember> {
    return this.channels.addMember(actor, channelId, body.memberId);
  }

  /** Leave (your own member id) or, as an admin, remove someone. */
  @Delete("members/:memberId")
  @RequirePermission("delete", "ChannelMember")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Param("memberId") memberId: string
  ): Promise<null> {
    await this.channels.removeMember(actor, channelId, memberId);
    return null;
  }

  /** Advances your read cursor (never backwards). */
  @Post("mark-read")
  @RequirePermission("update", "ChannelMember")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ChannelMemberDto })
  executeMarkRead(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Body() body: MarkReadRequestDto
  ): Promise<ChannelMember> {
    return this.channels.markRead(actor, channelId, body.seq);
  }
}
