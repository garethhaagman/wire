# Wire UI

Wire's client UI is **config-driven**: one typed, versioned configuration document controls color, typography, icon pack, branding, motion, and layout for every workspace, and that document is customizable per-organization and per-user without a code change. This folder is the design spec for that system; [stack.md](./stack.md) is where it becomes a specific stack, matching the split `internal-docs/stack/` already uses for the backend.

## Why a config system, not a theming prop or two

Wire's buyers skew toward orgs that white-label internal tools or run Wire alongside their own brand (see [gtm/icp-wedge.md](../gtm/icp-wedge.md)) — a fixed palette + a dark-mode toggle is not enough. The ask this system answers: let an org brand the product as their own, let individual users adjust the parts that are personal preference (density, layout, theme), and let an org _lock_ the parts that are brand/compliance-sensitive — all without Wire engineering shipping a bespoke build per customer. A single structured config, resolved server-side per session, is the only way to get all three without the client and server drifting on what "the UI" currently is.

## Documentation map

| Doc                                              | Contents                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [stack.md](./stack.md)                           | React, Tailwind, shadcn/ui — why this stack, how it fits the config model            |
| [config-schema.md](./config-schema.md)           | The `UiConfig` shape, versioning, the `@wire/ui-config` package, extensibility rules |
| [theming-and-layout.md](./theming-and-layout.md) | Resolution (base → org → user), locks, slots/layouts, how config becomes pixels      |
| [admin-policy.md](./admin-policy.md)             | What an org admin can enforce, the locks API, RBAC                                   |

## The one-sentence model

**Base config** (shipped defaults) is overridden by **org config** (admin-authored, can lock any field) is overridden by **user config** (personal preference) — resolved into one final document **on the server**, which is the only thing the client ever renders from.

## Status

Implemented: `@wire/ui-config` (schema, base config, resolver, CSS variable projection), the `GET/PATCH /v1/workspaces/:workspaceId/ui-config` endpoints (Postgres-backed), and a minimal config-driven shell in `apps/web` (nav rail, channel list, topbar, composer slots) proving the pattern. Not yet built: the admin settings UI for editing org config/locks, the user-facing theme/layout picker, and additional layouts beyond `default`.
