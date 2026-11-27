import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  Database,
  findAgentRun,
  listAgentRunSteps,
  listAgentRunsForAgent,
} from "@wire/db";
import type { AgentRun } from "@wire/types";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { AgentRunnerService } from "./agent-runner.service.js";
import { AgentsService } from "./agents.service.js";
import {
  AgentRunDto,
  AgentRunWithStepsDto,
  CreateAgentRunRequestDto,
} from "./dto/agent.dto.js";

/**
 * Nested one level under /agents/:id so a run always resolves through its owning
 * agent (and that agent's existence/ACL) first: see AgentsService.getById.
 */
@ApiTags("Agents")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/agents/:agentId/runs")
export class AgentRunsController {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly agents: AgentsService,
    private readonly runner: AgentRunnerService
  ) {}

  @Post()
  @ApiOperation({
    operationId: "run_agent",
    summary:
      "Start a run of an agent with a prompt, optionally posting its output to a channel",
  })
  @RequirePermission("create", "Agent")
  @ApiCreatedResponse({ type: AgentRunDto })
  async run(
    @CurrentActor() actor: WorkspaceActor,
    @Param("agentId") agentId: string,
    @Body() body: CreateAgentRunRequestDto
  ): Promise<AgentRun> {
    const agent = await this.agents.getById(actor, agentId);
    return this.runner.trigger({
      workspaceId: actor.workspaceId,
      agent,
      prompt: body.prompt,
      channelId: body.channelId,
    });
  }

  @Get()
  @ApiOperation({
    operationId: "list_agent_runs",
    summary: "List past runs of an agent, newest first",
  })
  @RequirePermission("read", "Agent")
  @ApiOkResponse({ type: AgentRunDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("agentId") agentId: string,
    @Query() query: PaginationQueryDto
  ): Promise<PaginatedResult<AgentRun>> {
    await this.agents.getById(actor, agentId);
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await listAgentRunsForAgent(
      this.db,
      actor.workspaceId,
      agentId,
      page,
      perPage
    );
    return new PaginatedResult(
      items,
      buildPaginationMeta(page, perPage, total)
    );
  }

  @Get(":runId")
  @ApiOperation({
    operationId: "get_agent_run",
    summary: "Get one agent run including its step-by-step trace",
  })
  @RequirePermission("read", "Agent")
  @ApiOkResponse({ type: AgentRunWithStepsDto })
  async getById(
    @CurrentActor() actor: WorkspaceActor,
    @Param("agentId") agentId: string,
    @Param("runId") runId: string
  ): Promise<AgentRunWithStepsDto> {
    await this.agents.getById(actor, agentId);
    const run = await findAgentRun(this.db, actor.workspaceId, runId);
    if (!run || run.agentId !== agentId) {
      throw new NotFoundException(`No run with id ${runId}`);
    }
    const steps = await listAgentRunSteps(this.db, runId);
    return Object.assign(new AgentRunWithStepsDto(), run, { steps });
  }
}
