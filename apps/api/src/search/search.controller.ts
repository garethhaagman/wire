import { Controller, Get, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { SearchResult } from "@wire/types";
import { buildPaginationMeta } from "../common/dto/pagination-meta.js";
import { PaginatedResult } from "../common/dto/paginated-result.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { SearchService } from "./search.service.js";
import { SearchQueryDto } from "./dto/search-query.dto.js";
import { SearchResultDto } from "./dto/search-result.dto.js";

/**
 * Keyword search only — matches internal-docs/product/05-feature-parity.md's
 * "GET /search" row. Semantic/hybrid search endpoints are not implemented; see
 * internal-docs/retrieval/retrieval.md for the target design.
 */
@ApiTags("Search")
@ApiCookieAuth()
@Controller("v1/search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @RequirePermission("read", "Search")
  @ApiOkResponse({ type: SearchResultDto, isArray: true })
  list(@Query() query: SearchQueryDto): PaginatedResult<SearchResult> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const { items, total } = this.search.search(query.q, page, perPage);
    return new PaginatedResult(items, buildPaginationMeta(page, perPage, total));
  }
}
