# Permissions (RBAC)

Every authenticated endpoint declares the exact CASL `(action, subject)` permission it requires via `@RequirePermission(action, subject)`. Two roles compose from the same permission vocabulary, `admin` (full access) and `member` (a curated subset), rather than each endpoint hand-rolling its own role check.

## Why CASL

[`@casl/ability`](https://casl.js.org) models permissions as `can(action, subject)` rules rather than flat role strings. There's no official `@casl/nestjs` package: CASL is deliberately framework-agnostic, and the integration is a thin guard + decorator, which is the pattern below. The advantage over a hand-rolled permission enum: CASL's rule model extends cleanly to conditional/instance-level rules (e.g. "member can delete their own message, not others'") without a rewrite, once that's needed; flat enums don't carry that path.

## The pieces

| File                                                       | Role                                                                                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/permissions/permission.types.ts`             | The action/subject vocabulary (`PermissionAction`, `PermissionSubject`) and the `AppAbility` type                                                                |
| `apps/api/src/permissions/ability.factory.ts`              | `defineAbilityFor(role)`: builds a CASL ability via `AbilityBuilder`; this is the one place role→permission composition lives                                    |
| `apps/api/src/permissions/workspace-scope.decorator.ts`    | `@WorkspaceScope(...)`: tells the guard how to get from a route's channel/message/file id back to its workspace. Routes with a `:workspaceId` param need nothing |
| `apps/api/src/permissions/scope-resolver.service.ts`       | Resolves resource to workspace (immutable, so memoized in an in-process LRU)                                                                                     |
| `apps/api/src/permissions/member-resolver.service.ts`      | Resolves the caller's active `Member` in that workspace (Redis-cached, invalidated on member changes); claims a pending email invite on first access             |
| `apps/api/src/permissions/actor.ts`                        | `@CurrentActor()` / `@CurrentUser()`: the resolved caller (user, member, role) for handlers                                                                      |
| `apps/api/src/permissions/require-permission.decorator.ts` | `@RequirePermission(action, subject)`: a `Reflector.createDecorator`-based decorator, the canonical NestJS pattern                                               |
| `apps/api/src/permissions/permissions.guard.ts`            | Global guard: resolves workspace + membership (404 for non-members), derives role, checks the ability, throws `403 PERMISSION_DENIED` on failure                 |
| `apps/api/src/auth/public.decorator.ts`                    | `@Public()`: exempts a route from both `SessionGuard` and `PermissionsGuard` (health checks only, today)                                                         |

## Actions and subjects

```typescript
type PermissionAction = "manage" | "create" | "read" | "update" | "delete";

type PermissionSubject =
  | "all" // CASL wildcard, only used by admin's `can("manage", "all")`
  | "Workspace"
  | "Member"
  | "Channel"
  | "ChannelMember"
  | "Message"
  | "Thread"
  | "Reaction"
  | "Pin"
  | "Bookmark"
  | "Agent"
  | "File"
  | "Search"
  | "WebhookEndpoint"
  | "AuditEvent"
  | "UiConfig"
  | "Event"
  | "Presence";
```

One subject per controller/resource. `manage` is CASL's wildcard action (implies every other action on that subject), used only in the admin rule.

## Role composition

Workspace member roles `owner` and `admin` map to the CASL `admin` role; `member` and `guest` map to `member`.

| Subject          | admin  | member                                                                                                                    |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| Workspace        | manage | create, read                                                                                                              |
| Member           | manage | read, update (**not** create; inviting is admin-only); the service limits non-admins to their own `displayName`           |
| Channel          | manage | create, read, update (archive/unarchive (`delete`) is admin-only; renaming requires channel membership)                   |
| ChannelMember    | manage | create, read, update (own read cursor), delete (removing someone else is admin-only, a service rule)                      |
| Message          | manage | create, read, update, delete (the service limits members to their own messages; admins can delete but never edit others') |
| Thread           | manage | create, read, update (own read cursor)                                                                                    |
| Reaction         | manage | create, read, delete                                                                                                      |
| Pin              | manage | create, read, delete                                                                                                      |
| Bookmark         | manage | create, read, delete (always the caller's own)                                                                            |
| Agent            | manage | create, read (update/delete, i.e. pause/retire, are admin-only)                                                           |
| File             | manage | create, read                                                                                                              |
| Search           | manage | read                                                                                                                      |
| Event / Presence | manage | read / create, read                                                                                                       |
| AuditEvent       | manage | **read** (explicit product decision, not a default; see below)                                                            |
| UiConfig         | manage | read, update (own layer; the org layer (`manage`) is admin-only)                                                          |
| WebhookEndpoint  | manage | **no permissions at all** (admin-only)                                                                                    |

`admin`'s single `can("manage", "all")` rule covers every subject; `member`'s rules are listed explicitly in `ability.factory.ts`; there is no implicit grant.

CASL answers "may this role do this kind of thing"; per-row rules (own message, channel membership, last owner) live in the services. On top of both, `ChannelAccessService` enforces channel visibility: public channels are readable by any non-guest member, private/dm/group_dm channels (and everything, for guests) require channel membership, and an invisible channel is a 404, never a 403.

### Two decisions worth calling out

- **Audit events are member-readable.** The obvious default ("audit logs are admin-only") was considered and explicitly rejected for this product: any authenticated workspace member can read the workspace's audit trail. If this guide is ever used as a template elsewhere, don't assume this default carries over; it was a deliberate call here.
- **Webhook endpoints are fully admin-gated.** Configuring where the workspace's events get delivered (and seeing/regenerating the signing secret) is sensitive enough that `member` gets zero permissions on this subject, not even `read`.

## Usage on a new endpoint

```typescript
@Post()
@RequirePermission("create", "Message")
@ApiCreatedResponse({ type: MessageDto })
create(@Body() body: CreateMessageRequestDto): Message { ... }
```

For a route that must work without authentication at all (not "low privilege", **no session required**), use `@Public()` instead; see `health.controller.ts`'s `get()` for the only current example.

## How the guards are wired

`SessionGuard` and `PermissionsGuard` are registered as **global** guards (`APP_GUARD` in `apps/api/src/permissions/permissions.module.ts`), not per-controller `@UseGuards()`. Global guards run in registration order, before any controller/method-level guard: `SessionGuard` first (populates `req.session`), `PermissionsGuard` second (reads it). Get this order wrong and `PermissionsGuard` silently sees no session on every request; it was confirmed from NestJS's own `guards-context-creator.js` (`globalGuards.concat(scopedGuards)`) during implementation, not assumed.

`PermissionsGuard` fails closed: a route with neither `@RequirePermission` nor `@Public()` throws `500 INTERNAL_ERROR` rather than silently allowing the request. This is defense in depth; the real enforcement is `wire-api/require-permission`, a lint rule that fails the build if any `@Get/@Post/@Put/@Patch/@Delete` handler is missing one or the other (see `packages/eslint-plugin-wire-api/rules/require-permission.js`).

## Workspace scope on routes without `:workspaceId`

Routes nested under a channel, message, thread or file declare how to find their workspace:

```typescript
@WorkspaceScope({ from: "channel", param: "channelId" })
@Controller("v1/channels/:channelId/messages")
export class MessagesController { ... }
```

Sources: `workspace` / `channel` / `message` / `file` (route param), `bodyChannel` (e.g. `POST /v1/files` takes `channelId` in the body), and `optionalQueryWorkspace` (search: scoped when `?workspace_id=` is present, otherwise the service searches every workspace the caller belongs to). The guard then requires an active membership in that workspace: a missing resource and a non-member both get the same 404, so ids can't be probed. A route that uses `@CurrentActor()` without any scope fails loudly with `INTERNAL_ERROR` rather than running without tenancy.
