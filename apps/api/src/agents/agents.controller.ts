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
import type { Agent } from "@wire/types";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { IdempotencyInterceptor } from "../common/interceptors/idempotency.interceptor.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { AgentsService } from "./agents.service.js";
import {
  AgentDto,
  CreateAgentRequestDto,
  UpdateAgentRequestDto,
} from "./dto/agent.dto.js";

@ApiTags("Agents")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/agents")
export class AgentsController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  @ApiOperation({
    operationId: "list_agents",
    summary: "List the agents configured in the workspace",
  })
  @RequirePermission("read", "Agent")
  @ApiOkResponse({ type: AgentDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<Agent>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.agents.list(actor, page, perPage);
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  @Get(":id")
  @ApiOperation({
    operationId: "get_agent",
    summary: "Get one agent's configuration",
  })
  @RequirePermission("read", "Agent")
  @ApiOkResponse({ type: AgentDto })
  getById(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<Agent> {
    return this.agents.getById(actor, id);
  }

  @Post()
  @ApiOperation({
    operationId: "create_agent",
    summary: "Create an agent in the workspace",
  })
  @RequirePermission("create", "Agent")
  @ApiHeader({
    name: "Idempotency-Key",
    required: false,
    description: "Replays the original response if the same key is sent again.",
  })
  @ApiCreatedResponse({ type: AgentDto })
  @UseInterceptors(IdempotencyInterceptor)
  create(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: CreateAgentRequestDto
  ): Promise<Agent> {
    return this.agents.create(actor, body);
  }

  @Patch(":id")
  @ApiOperation({
    operationId: "update_agent",
    summary: "Update an agent's configuration",
  })
  @RequirePermission("update", "Agent")
  @ApiOkResponse({ type: AgentDto })
  update(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string,
    @Body() body: UpdateAgentRequestDto
  ): Promise<Agent> {
    return this.agents.update(actor, id, body);
  }

  @Delete(":id")
  @ApiOperation({ operationId: "delete_agent", summary: "Delete an agent" })
  @RequirePermission("delete", "Agent")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("id") id: string
  ): Promise<null> {
    await this.agents.remove(actor, id);
    return null;
  }
}
