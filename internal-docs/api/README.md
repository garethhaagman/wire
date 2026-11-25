# Wire HTTP API

The API follows a single set of conventions across every endpoint — naming, versioning, requests, responses, errors, and headers — so an SDK needs exactly one generic HTTP handler regardless of which endpoint it calls. See [skills/api-design](../../.claude/skills/api-design/SKILL.md) for the agent-facing version of this guide.

**The OpenAPI spec is generated, not hand-written.** `openapi.yaml` in this folder is produced by `apps/api/scripts/export-openapi.ts` from the `@nestjs/swagger` decorators on the real controllers — it is never edited directly. Regenerate it with:

```sh
cd apps/api
DATABASE_URL=... bun run openapi:export
```

Change the controllers/DTOs, then re-run the export. A stale `openapi.yaml` relative to the controllers is a bug, not a documentation lag — there is no other source of truth to fall out of sync with.

## Base URL

```
https://api.wire.example/v1
```

## Documentation map

| Doc                                          | Contents                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| [versioning.md](./versioning.md)             | URL major versions, experimental/beta lifecycle, deprecation and sunset  |
| [naming-and-verbs.md](./naming-and-verbs.md) | Resource naming, HTTP verb semantics                                     |
| [responses.md](./responses.md)               | The universal response envelope                                          |
| [errors.md](./errors.md)                     | Stable machine-readable error codes                                      |
| [headers.md](./headers.md)                   | Request/response headers, rate limiting, deprecation signals             |
| [pagination.md](./pagination.md)             | Shared pagination, filtering, and sorting contract                       |
| [numeric-data.md](./numeric-data.md)         | Number vs. string conventions, safe integers, money fields               |
| [sdk-architecture.md](./sdk-architecture.md) | Why one generic handler is enough for every endpoint                     |
| [auth-tenancy.md](./auth-tenancy.md)         | Auth, RBAC, org/workspace boundaries                                     |
| [events-webhooks.md](./events-webhooks.md)   | Realtime and async integration                                           |
| `openapi.yaml`                               | **Generated OpenAPI 3.0 spec** — the canonical machine-readable contract |

## Authentication

```http
Authorization: Bearer wire_sk_...
```

See [auth-tenancy.md](./auth-tenancy.md) for the full credential and scope model.

## Related

- [Feature parity](../product/05-feature-parity.md)
- [Agents](../product/03-agents.md)
- [MCP](../mcp/mcp.md)
- [Onboarding (import-first)](../import/workspace-import.md)
