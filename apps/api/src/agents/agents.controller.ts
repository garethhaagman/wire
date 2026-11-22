import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Agent } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { AgentsService } from "./agents.service.js";
import { AgentDto, CreateAgentRequestDto } from "./dto/agent.dto.js";

@ApiTags("Agents")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/agents")
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  @RequirePermission("read", "Agent")
  @ApiOkResponse({ type: AgentDto, isArray: true })
  list(@Query() query: PaginationQueryDto): PaginatedResult<Agent> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.agents.list(page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "Agent")
  @ApiOkResponse({ type: AgentDto })
  getById(@Param("id") id: string): Agent {
    return this.agents.getById(id);
  }

  @Post()
  @RequirePermission("create", "Agent")
  @ApiCreatedResponse({ type: AgentDto })
  create(@Param("workspaceId") workspaceId: string, @Body() body: CreateAgentRequestDto): Agent {
    return this.agents.create(workspaceId, body);
  }
}
