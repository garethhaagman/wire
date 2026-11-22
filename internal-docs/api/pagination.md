# Pagination, filtering, and sorting

Every collection endpoint uses the same query conventions.

```http
GET /v1/workspaces?page=1&per_page=20
GET /v1/workspaces?sort=-created_at
GET /v1/workspaces?filter[dataRegion]=us
GET /v1/workspaces?search=acme
```

| Parameter | Purpose | Default |
|-----------|---------|---------|
| `page` | Page number (1-indexed) | `1` |
| `per_page` | Results per page | `20` (max `100`) |
| `sort` | Sort field; prefix with `-` for descending | resource-defined |
| `filter[field]` | Filter by field | — |
| `search` | Free-text search query | — |

Pagination metadata is always in the response envelope's `meta.pagination`, never in the response body itself:

```json
{
  "success": true,
  "data": [ ... ],
  "error": null,
  "meta": {
    "request_id": "req_...",
    "api_version": "v1",
    "pagination": { "page": 1, "per_page": 20, "total": 134, "total_pages": 7 }
  }
}
```

## Implementation

`PaginationQueryDto` (`apps/api/src/common/dto/pagination-query.dto.ts`) validates and type-coerces `page`/`per_page`/`sort`/`search` as a `@Query()` parameter; `parseFilterQuery()` reads the dynamic `filter[field]` keys off the raw query object since they can't be bound by fixed DTO properties. `buildPaginationMeta()` (`apps/api/src/common/dto/pagination-meta.ts`) computes `total_pages`; controllers return a `PaginatedResult` wrapping the page of items plus the computed metadata — see [responses.md](./responses.md).

This is page-based pagination, not cursor-based — simpler for the current resource set (workspaces, members, channels, agents). High-volume, high-write resources (messages, agent run steps) should move to cursor-based pagination before their row counts make `OFFSET`-style paging slow; that's a per-resource decision, not a global API change, since `meta.pagination`'s shape would need a cursor variant alongside the page-based one.
