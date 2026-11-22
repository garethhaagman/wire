import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseInterceptors } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Member, MemberPreferences } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { MembersService } from "./members.service.js";
import {
  CreateMemberRequestDto,
  MemberDto,
  MemberPreferencesDto,
  UpdateMemberPreferencesRequestDto,
  UpdateMemberRequestDto,
} from "./dto/member.dto.js";

@ApiTags("Members")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto, isArray: true })
  async list(@CurrentActor() actor: WorkspaceActor, @Query() query: PaginationQueryDto): Promise<PaginatedResult<Member>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.members.list(actor, page, perPage, query.search);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get("me")
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto })
  getMe(@CurrentActor() actor: WorkspaceActor): Promise<Member> {
    return this.members.getById(actor, actor.member.id);
  }

  @Get("me/preferences")
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberPreferencesDto })
  getPreferences(@CurrentActor() actor: WorkspaceActor): Promise<MemberPreferences> {
    return this.members.getPreferences(actor);
  }

  @Patch("me/preferences")
  @RequirePermission("update", "Member")
  @ApiOkResponse({ type: MemberPreferencesDto })
  updatePreferences(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: UpdateMemberPreferencesRequestDto,
  ): Promise<MemberPreferences> {
    return this.members.updatePreferences(actor, body);
  }

  @Get(":id")
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto })
  getById(@CurrentActor() actor: WorkspaceActor, @Param("id") id: string): Promise<Member> {
    return this.members.getById(actor, id);
  }

  @Post()
  @RequirePermission("create", "Member")
  @ApiHeader({ name: "Idempotency-Key", required: false, description: "Replays the original response if the same key is sent again." })
  @ApiCreatedResponse({ type: MemberDto })
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentActor() actor: WorkspaceActor, @Body() body: CreateMemberRequestDto): Promise<Member> {
    return this.members.create(actor, body);
  }

  @Patch(":id")
  @RequirePermission("update", "Member")
  @ApiOkResponse({ type: MemberDto })
  update(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string,
    @Body() body: UpdateMemberRequestDto,
  ): Promise<Member> {
    return this.members.update(actor, id, body);
  }

  @Delete(":id")
  @RequirePermission("delete", "Member")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(@CurrentActor() actor: WorkspaceActor, @Param("id") id: string): Promise<null> {
    await this.members.remove(actor, id);
    return null;
  }
}
