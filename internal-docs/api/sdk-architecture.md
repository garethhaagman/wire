# SDK architecture: one universal handler

An SDK should never need to understand individual endpoints' response structures — every endpoint follows the same envelope (see [responses.md](./responses.md)), so one generic handler covers all of them.

## Reference client shape

```typescript
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result: ApiResponse<T> = await res.json();
  if (!result.success) throw new ApiException(result.error);
  return result.data as T;
}
```

`apps/web/src/lib/api-client.ts`'s `apiFetch()` is exactly this pattern for the web app — it's the thing to copy when building any new client, including a standalone SDK package.

In production this handler should additionally: handle non-JSON and empty responses, handle network failures and timeouts, respect `Retry-After` (see [headers.md](./headers.md)), implement bounded retries, capture request IDs for support correlation, and support API version selection.

## Endpoint methods are thin wrappers

```typescript
const workspaces = {
  list: () => request<Workspace[]>("GET", "/workspaces"),
  get: (id: string) => request<Workspace>("GET", `/workspaces/${id}`),
  create: (data: CreateWorkspaceRequest) => request<Workspace>("POST", "/workspaces", data),
};
```

The SDK only needs to understand the shared HTTP and response infrastructure — not each resource's quirks, because there are none; every resource follows the same contract.

## The architectural principle behind all of this

Build these conventions into the framework rather than relying on every handler to remember them. `apps/api/src/common/` is exactly this: `ResponseEnvelopeInterceptor`, `ApiExceptionFilter`, `ValidationPipe` + `validationExceptionFactory`, `RequestIdMiddleware`, `RateLimitMiddleware`, `DeprecationHeadersInterceptor`, `IdempotencyInterceptor`, `PaginationQueryDto` + `buildPaginationMeta`. A new resource controller only describes _what_ it does (list/get/create plus its own DTOs); the shared infrastructure decides _how_ requests are authenticated, validated, versioned, rate-limited, formatted, and returned. `@wire/eslint-plugin-wire-api` enforces the boundary — see [../../packages/eslint-plugin-wire-api](../../packages/eslint-plugin-wire-api).

That separation is what makes the API scalable, maintainable, and easy to integrate with any SDK.
