import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { WebhookEndpoint } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WebhooksService } from "./webhooks.service.js";
import {
  CreateWebhookEndpointRequestDto,
  WebhookEndpointCreatedDto,
  WebhookEndpointDto,
} from "./dto/webhook-endpoint.dto.js";

/** Admin-only — see internal-docs/api/permissions.md, the member role has no
 * WebhookEndpoint permissions at all. */
@ApiTags("Webhooks")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/webhook-endpoints")
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Get()
  @RequirePermission("read", "WebhookEndpoint")
  @ApiOkResponse({ type: WebhookEndpointDto, isArray: true })
  async list(
    @CurrentActor() actor: WorkspaceActor,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<WebhookEndpoint>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.webhooks.list(actor, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "WebhookEndpoint")
  @ApiOkResponse({ type: WebhookEndpointDto })
  getById(@CurrentActor() actor: WorkspaceActor, @Param("id") id: string): Promise<WebhookEndpoint> {
    return this.webhooks.getById(actor, id);
  }

  @Post()
  @RequirePermission("create", "WebhookEndpoint")
  @ApiCreatedResponse({ type: WebhookEndpointCreatedDto })
  create(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: CreateWebhookEndpointRequestDto,
  ): Promise<WebhookEndpointCreatedDto> {
    return this.webhooks.create(actor, body);
  }

  @Delete(":id")
  @RequirePermission("delete", "WebhookEndpoint")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(@CurrentActor() actor: WorkspaceActor, @Param("id") id: string): Promise<null> {
    await this.webhooks.remove(actor, id);
    return null;
  }
}
