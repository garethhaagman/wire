# Authentication and tenancy

## Layers

```text
Organization (billing, SSO)
└── Workspace (data plane, API keys, agents)
    └── Channels, messages, indexes
```

## Human authentication

- OIDC / SAML at organization level.
- Session cookies for interactive clients (out of scope for spec detail).
- **OAuth 2.1** for third-party apps: authorization code + PKCE, scopes below.
- **Primary capture** — Workspace admins onboard via [Slack export import](../import/workspace-import.md); users **claim** imported members on first login (email or token).

## Machine authentication

| Credential                        | Scope                           |
| --------------------------------- | ------------------------------- |
| Workspace API key (`wire_sk_...`) | Static scopes, rotatable        |
| Org API key                       | Cross-workspace admin APIs only |
| Agent token (`wire_at_...`)       | Agent permission set only       |
| Automation token (`wire_au_...`)  | Single automation + actions     |
| MCP delegation token              | Short-lived, tool-scoped        |

Never return full API keys after creation—show once.

## OAuth scopes (representative)

```
workspace:read
channels:read
channels:write
messages:read
messages:write
members:read
agents:read
agents:write
agents:invoke
automations:read
automations:write
search:read
context_packs:write
files:read
files:write
admin:workspace
imports:read
imports:write
```

Fine-grained channel ACLs intersect with scopes: lacking `channel:ch_xyz:read` denies even if `messages:read` is present (when channel restrictions enabled).

## RBAC roles (workspace)

| Role               | Capabilities                      |
| ------------------ | --------------------------------- |
| `owner`            | Delete workspace, billing         |
| `admin`            | Members, agents, policies         |
| `member`           | Default participate               |
| `guest`            | Limited channels                  |
| `agent_supervisor` | Approve runs, publish automations |

Agents never receive `owner`; maximum is configured per `permission_set`.

## Multi-workspace

JWT includes `ws` claim for active workspace; switching via `POST /v1/session/workspace`.

## Audit log

`GET /v1/audit-events` — actor, ip, resource, action, `agent_run_id` if applicable. Immutable retention configurable.

## Data residency

Workspace setting `data_region` (e.g. `us`, `eu`) pins storage and search.

## Response shape

Auth failures (missing/invalid credentials, insufficient permissions) go through the same universal envelope as every other endpoint — `AUTHENTICATION_ERROR` / `PERMISSION_DENIED`, see [errors.md](./errors.md). `SessionGuard` (`apps/api/src/auth/session.guard.ts`) is what throws these for session-authenticated routes.
