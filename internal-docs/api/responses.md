# Response envelope

Every JSON response uses the same outer structure, regardless of endpoint or HTTP status. This is the single most important decision in the API's shape — it means an SDK needs exactly one generic handler for every endpoint (see [sdk-architecture.md](./sdk-architecture.md)).

## Shape

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta: ApiMeta;
}
```

Defined in `@wire/types` (`packages/types/src/envelope.ts`) — the single canonical definition every service and client imports.

## Successful response

```json
{
  "success": true,
  "data": { "id": "ws_abc123", "name": "Acme", "dataRegion": "us" },
  "error": null,
  "meta": {
    "request_id": "req_...",
    "api_version": "v1"
  }
}
```

## Collection response

```json
{
  "success": true,
  "data": [{ "id": "ws_abc123", "name": "Acme" }],
  "error": null,
  "meta": {
    "request_id": "req_...",
    "api_version": "v1",
    "pagination": { "page": 1, "per_page": 20, "total": 1, "total_pages": 1 }
  }
}
```

## Error response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [{ "field": "email", "code": "ISEMAIL", "message": "email must be an email" }]
  },
  "meta": {
    "request_id": "req_...",
    "api_version": "v1"
  }
}
```

See [errors.md](./errors.md) for the full error code list.

## Standard HTTP status codes

| Code | Meaning               | Typical use                 |
| ---- | --------------------- | --------------------------- |
| 200  | OK                    | Successful retrieval/update |
| 201  | Created               | Resource created            |
| 202  | Accepted              | Async operation accepted    |
| 400  | Bad Request           | Malformed request           |
| 401  | Unauthenticated       | Missing/invalid credentials |
| 403  | Forbidden             | Insufficient permissions    |
| 404  | Not Found             | Resource doesn't exist      |
| 409  | Conflict              | Conflicting operation       |
| 422  | Unprocessable Entity  | Validation failure          |
| 429  | Too Many Requests     | Rate limited                |
| 500  | Internal Server Error | Unexpected error            |
| 503  | Service Unavailable   | Temporary outage            |

**204 is never used.** A `204 No Content` cannot carry a body, which would break the universal envelope guarantee — every response, including deletions, returns `200` with `data: null` instead.

## Implementation (never build this by hand in a controller)

Controllers return plain data; the envelope is applied automatically by `ResponseEnvelopeInterceptor` (`apps/api/src/common/interceptors/response-envelope.interceptor.ts`), registered globally in `create-app.ts`. Errors go through `ApiExceptionFilter` (`apps/api/src/common/filters/api-exception.filter.ts`) the same way.

For paginated collections, return a `PaginatedResult` (`apps/api/src/common/dto/paginated-result.ts`) instead of a raw array — the interceptor reads it to populate `meta.pagination`.

`@wire/eslint-plugin-wire-api`'s `no-manual-envelope` rule flags any controller/service that hand-builds an object shaped like the envelope — that always indicates a bug (double-wrapping) rather than intentional code.
