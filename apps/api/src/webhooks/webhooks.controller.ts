import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { WebhookEndpoint } from "@wire/types";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto.js";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
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
  list(
    @Param("workspaceId") workspaceId: string,
    @Query() query: PaginationQueryDto,
  ): PaginatedResult<WebhookEndpoint> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.webhooks.list(workspaceId, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }

  @Get(":id")
  @RequirePermission("read", "WebhookEndpoint")
  @ApiOkResponse({ type: WebhookEndpointDto })
  getById(@Param("workspaceId") workspaceId: string, @Param("id") id: string): WebhookEndpoint {
    return this.webhooks.getById(workspaceId, id);
  }

  @Post()
  @RequirePermission("create", "WebhookEndpoint")
  @ApiCreatedResponse({ type: WebhookEndpointCreatedDto })
  create(
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateWebhookEndpointRequestDto,
  ): WebhookEndpointCreatedDto {
    return this.webhooks.create(workspaceId, body);
  }

  @Delete(":id")
  @RequirePermission("delete", "WebhookEndpoint")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  remove(@Param("workspaceId") workspaceId: string, @Param("id") id: string): null {
    this.webhooks.remove(workspaceId, id);
    return null;
  }
}
