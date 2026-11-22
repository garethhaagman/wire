import { Controller, Get, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { SearchResult } from "@wire/types";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { CurrentUser, type RequestActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import { SearchService } from "./search.service.js";
import { SearchQueryDto } from "./dto/search-query.dto.js";
import { SearchResultDto } from "./dto/search-result.dto.js";

/**
 * Keyword search — internal-docs/product/05-feature-parity.md's "GET /search" row.
 * Results only include messages the caller can read. Semantic/hybrid search is
 * internal-docs/retrieval/retrieval.md.
 */
@ApiTags("Search")
@ApiCookieAuth()
@Controller("v1/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @WorkspaceScope({ from: "optionalQueryWorkspace", key: "workspace_id" })
  @RequirePermission("read", "Search")
  @ApiOkResponse({ type: SearchResultDto, isArray: true })
  async list(@CurrentUser() actor: RequestActor, @Query() query: SearchQueryDto): Promise<PaginatedResult<SearchResult>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = await this.search.search(actor, {
      query: query.q,
      channelId: query.channel_id,
      threadRootId: query.thread_root_id,
      page,
      perPage,
    });
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }
}
