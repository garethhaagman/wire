import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Member } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { MembersService } from "./members.service.js";
import { CreateMemberRequestDto, MemberDto } from "./dto/member.dto.js";

@ApiTags("Members")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/members")
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto, isArray: true })
  list(@Query() query: PaginationQueryDto): PaginatedResult<Member> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.members.list(page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "Member")
  @ApiOkResponse({ type: MemberDto })
  getById(@Param("id") id: string): Member {
    return this.members.getById(id);
  }

  @Post()
  @RequirePermission("create", "Member")
  @ApiCreatedResponse({ type: MemberDto })
  create(
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateMemberRequestDto,
  ): Member {
    return this.members.create(workspaceId, body);
  }
}
