# Permissions (RBAC)

Every authenticated endpoint declares the exact CASL `(action, subject)` permission it requires via `@RequirePermission(action, subject)`. Two roles compose from the same permission vocabulary — `admin` (full access) and `member` (a curated subset) — rather than each endpoint hand-rolling its own role check.

## Why CASL

[`@casl/ability`](https://casl.js.org) models permissions as `can(action, subject)` rules rather than flat role strings. There's no official `@casl/nestjs` package — CASL is deliberately framework-agnostic, and the integration is a thin guard + decorator, which is the pattern below. The advantage over a hand-rolled permission enum: CASL's rule model extends cleanly to conditional/instance-level rules (e.g. "member can delete their own message, not others'") without a rewrite, once that's needed — flat enums don't carry that path.

## The pieces

| File | Role |
|------|------|
| `apps/api/src/permissions/permission.types.ts` | The action/subject vocabulary (`PermissionAction`, `PermissionSubject`) and the `AppAbility` type |
| `apps/api/src/permissions/ability.factory.ts` | `defineAbilityFor(role)` — builds a CASL ability via `AbilityBuilder`; this is the one place role→permission composition lives |
| `apps/api/src/permissions/role-resolver.service.ts` | Resolves a request's role (`admin` or `member`) by looking up the caller's `Member` record in the request's `:workspaceId` |
| `apps/api/src/permissions/require-permission.decorator.ts` | `@RequirePermission(action, subject)` — a `Reflector.createDecorator`-based decorator, the canonical NestJS pattern |
| `apps/api/src/permissions/permissions.guard.ts` | Global guard — reads the decorator's metadata, resolves role, checks the ability, throws `403 PERMISSION_DENIED` on failure |
| `apps/api/src/auth/public.decorator.ts` | `@Public()` — exempts a route from both `SessionGuard` and `PermissionsGuard` (health checks only, today) |

## Actions and subjects

```typescript
type PermissionAction = "manage" | "create" | "read" | "update" | "delete";

type PermissionSubject =
  | "all" // CASL wildcard — only used by admin's `can("manage", "all")`
  | "Workspace" | "Member" | "Channel" | "Message" | "Thread"
  | "Reaction" | "Pin" | "Agent" | "File" | "Search"
  | "WebhookEndpoint" | "AuditEvent";
```

One subject per controller/resource. `manage` is CASL's wildcard action (implies every other action on that subject) — used only in the admin rule.

## Role composition

| Subject | admin | member |
|---------|-------|--------|
| Workspace | manage | create, read |
| Member | manage | read only — **not** create (inviting members is admin-only) |
| Channel | manage | create, read |
| Message | manage | create, read |
| Thread | manage | create, read |
| Reaction | manage | create, read, delete |
| Pin | manage | create, read, delete |
| Agent | manage | create, read |
| File | manage | create, read |
| Search | manage | read |
| AuditEvent | manage | **read** — explicit product decision, not a default; see below |
| WebhookEndpoint | manage | **no permissions at all** — admin-only |

`admin`'s single `can("manage", "all")` rule covers every subject; `member`'s rules are listed explicitly in `ability.factory.ts` — there is no implicit grant.

### Two decisions worth calling out

- **Audit events are member-readable.** The obvious default ("audit logs are admin-only") was considered and explicitly rejected for this product — any authenticated workspace member can read the workspace's audit trail. If this guide is ever used as a template elsewhere, don't assume this default carries over; it was a deliberate call here.
- **Webhook endpoints are fully admin-gated.** Configuring where the workspace's events get delivered (and seeing/regenerating the signing secret) is sensitive enough that `member` gets zero permissions on this subject, not even `read`.

## Usage on a new endpoint

```typescript
@Post()
@RequirePermission("create", "Message")
@ApiCreatedResponse({ type: MessageDto })
create(@Body() body: CreateMessageRequestDto): Message { ... }
```

For a route that must work without authentication at all (not "low privilege" — **no session required**), use `@Public()` instead — see `health.controller.ts`'s `get()` for the only current example.

## How the guards are wired

`SessionGuard` and `PermissionsGuard` are registered as **global** guards (`APP_GUARD` in `apps/api/src/permissions/permissions.module.ts`), not per-controller `@UseGuards()`. Global guards run in registration order, before any controller/method-level guard — `SessionGuard` first (populates `req.session`), `PermissionsGuard` second (reads it). Get this order wrong and `PermissionsGuard` silently sees no session on every request; it was confirmed from NestJS's own `guards-context-creator.js` (`globalGuards.concat(scopedGuards)`) during implementation, not assumed.

`PermissionsGuard` fails closed: a route with neither `@RequirePermission` nor `@Public()` throws `500 INTERNAL_ERROR` rather than silently allowing the request. This is defense in depth — the real enforcement is `wire-api/require-permission`, a lint rule that fails the build if any `@Get/@Post/@Put/@Patch/@Delete` handler is missing one or the other (see `packages/eslint-plugin-wire-api/rules/require-permission.js`).

## Known gap: role resolution for workspace-less routes

`RoleResolverService` resolves role by looking up the caller's `Member` record in `req.params.workspaceId`. Several controllers have no `:workspaceId` in their route at all — `messages`, `channels`, `reactions`, `pins`, `threads`, `search`, `files` are scoped by `channelId`/`messageId`/`threadRootId` or nothing. These currently **always resolve to `member`**, regardless of the caller's actual role, because there's no join from those IDs back to a workspace in the mock services. This is a real limitation to close once those resources carry a workspace reference (or once real Postgres-backed relations exist), not an intentional design choice — don't build on top of it assuming it's permanent.
