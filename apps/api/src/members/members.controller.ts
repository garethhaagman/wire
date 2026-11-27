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
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Member, MemberPreferences } from "@wire/types";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import {
  CreateMemberRequestDto,
  MemberDto,
  MemberPreferencesDto,
  UpdateMemberPreferencesRequestDto,
  UpdateMemberRequestDto,
} from "./dto/member.dto.js";
import { MembersService } from "./members.service.js";

@ApiTags("Members")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @ApiOperation({
    operationId: "list_members",
    summary:
      "List the members of the workspace, optionally filtered by a search term",
  })
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<Member>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.members.list(
      actor,
      page,
      perPage,
      query.search
    );
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  @Get("me")
  @ApiOperation({
    operationId: "get_current_member",
    summary: "Get the caller's own workspace membership",
  })
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto })
  getMe(@CurrentActor() actor: WorkspaceActor): Promise<Member> {
    return this.members.getById(actor, actor.member.id);
  }

  @Get("me/preferences")
  @ApiOperation({
    operationId: "get_my_preferences",
    summary: "Get the caller's notification and display preferences",
  })
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberPreferencesDto })
  getPreferences(
    @CurrentActor() actor: WorkspaceActor
  ): Promise<MemberPreferences> {
    return this.members.getPreferences(actor);
  }

  @Patch("me/preferences")
  @ApiOperation({
    operationId: "update_my_preferences",
    summary: "Update the caller's notification and display preferences",
  })
  @RequirePermission("update", "Member")
  @ApiOkResponse({ type: MemberPreferencesDto })
  updatePreferences(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: UpdateMemberPreferencesRequestDto
  ): Promise<MemberPreferences> {
    return this.members.updatePreferences(actor, body);
  }

  @Get(":id")
  @ApiOperation({
    operationId: "get_member",
    summary: "Get one workspace member",
  })
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto })
  getById(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<Member> {
    return this.members.getById(actor, id);
  }

  @Post()
  @ApiOperation({
    operationId: "invite_member",
    summary: "Invite a person to the workspace by email",
  })
  @RequirePermission("create", "Member")
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Replays the original response if the same key is sent again.",
  })
  @ApiCreatedResponse({ type: MemberDto })
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: CreateMemberRequestDto
  ): Promise<Member> {
    return this.members.create(actor, body);
  }

  @Patch(":id")
  @ApiOperation({
    operationId: "update_member",
    summary: "Update a member's display name or role",
  })
  @RequirePermission("update", "Member")
  @ApiOkResponse({ type: MemberDto })
  update(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string,
    @Body() body: UpdateMemberRequestDto
  ): Promise<Member> {
    return this.members.update(actor, id, body);
  }

  @Delete(":id")
  @ApiOperation({
    operationId: "remove_member",
    summary: "Deactivate a member and remove them from the workspace",
  })
  @RequirePermission("delete", "Member")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<null> {
    await this.members.remove(actor, id);
    return null;
  }
}
