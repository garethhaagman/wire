# Pagination, filtering, and sorting

Every collection endpoint uses the same query conventions.

```http
GET /v1/workspaces?page=1&per_page=20
GET /v1/workspaces?sort=-created_at
GET /v1/workspaces?filter[dataRegion]=us
GET /v1/workspaces?search=acme
```

| Parameter       | Purpose                                    | Default          |
| --------------- | ------------------------------------------ | ---------------- |
| `page`          | Page number (1-indexed)                    | `1`              |
| `per_page`      | Results per page                           | `20` (max `100`) |
| `sort`          | Sort field; prefix with `-` for descending | resource-defined |
| `filter[field]` | Filter by field                            | —                |
| `search`        | Free-text search query                     | —                |

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

Page-based pagination is used for bounded, low-write collections (workspaces, members, channels, agents, bookmarks, files, webhook endpoints, audit events, search).

## Cursor pagination (messages, thread replies, events)

High-write streams use keyset pagination on a per-channel (or per-workspace, for events) sequence number, so page N costs the same as page 1 and inserts never shift a page:

```
GET /v1/channels/{id}/messages?per_page=50            newest first
GET /v1/channels/{id}/messages?cursor=YjoxMjM0        next (older) page
GET /v1/channels/{id}/messages?after_seq=1234         oldest first from a known position (catch-up)
```

```json
{
  "meta": {
    "request_id": "req_...",
    "cursor": { "per_page": 50, "has_more": true, "next_cursor": "YjoxMTg1" }
  }
}
```

Cursors are opaque — clients pass `next_cursor` back unchanged and never construct one. `after_seq` is the exception: every message carries its `seq`, so a client that knows the last `seq` it rendered can catch up with `after_seq` directly. `CursorQueryDto`, `CursorPaginatedResult` and `encodeCursor`/`decodeCursor` live in `apps/api/src/common/dto/cursor-paginated-result.ts`; the response interceptor writes `meta.cursor` instead of `meta.pagination`.
