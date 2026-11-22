# Admin policy: locks and enforcement

## The problem locks solve

A workspace admin needs to do two different things that look similar but aren't: **set** a default (which a user can still change) and **enforce** a rule (which a user cannot). "Org brand color defaults to blue, but marketing wants it to always be blue, no exceptions" is the second kind. Locks are how the second kind is expressed without needing a second config mechanism.

## Shape

```typescript
interface Lock {
  path: string;           // dot-path into UiConfig, e.g. "theme.colors.primary"
  lockedBy: "org";        // the only lockable layer today
  reason?: string;        // optional, shown in future admin/settings UI
}
```

Defined in `packages/ui-config/src/locks.ts`. A `LockSet` is just `Lock[]`, stored alongside the org override (`UpdateOrgUiConfigRequest.locks` in `@wire/types`).

## Enforcement is in the resolver, not the API layer

`applyLocks()` (inside `resolveUiConfig()`, `packages/ui-config/src/resolve.ts`) runs **after** the base→org→user merge: for every lock path, it overwrites the merged tree at that path with the org layer's value (falling back to base if org didn't set a value there either), regardless of what the user layer contained. A user's `PATCH .../ui-config/me` call can still *write* a locked field to their personal layer — the write succeeds — it just never shows up in what `GET .../ui-config` returns, because the lock wins at resolve time, every time, unconditionally. There's no scenario where a lock is "mostly" respected.

### Locking a prefix locks everything beneath it

`path` is dot-notation with no wildcard syntax — `"theme"` locks every field nested under `theme.*`, not just a literal key named `theme`. This is deliberate: an org that wants to lock the entire visual identity (colors, typography, icon pack) writes one lock (`"theme"`), not sixteen (one per color role). `"layouts"` locks the entire layouts array — no user-authored custom layouts at all, not just "can't switch away from the pinned one." `"activeLayoutId"` alone (without locking `"layouts"`) lets users author their own layouts but always open the workspace on the org's chosen one.

## RBAC

| Action | CASL permission | Who |
|--------|------------------|-----|
| `GET /v1/workspaces/:id/ui-config` | `read`, `UiConfig` | Any workspace member |
| `PATCH /v1/workspaces/:id/ui-config/me` | `update`, `UiConfig` | Any workspace member — writes **only their own** user layer; the controller takes the session's own user id, never a route param, so there is no "edit someone else's preferences" path to even gate |
| `PATCH /v1/workspaces/:id/ui-config/org` | `manage`, `UiConfig` | `admin` only (CASL's `manage` wildcard implies this; `member`'s ability only grants `read`/`update`, not `manage`) |

Added to the existing CASL vocabulary in `apps/api/src/permissions/permission.types.ts` (`PermissionSubject` gains `"UiConfig"`) and `ability.factory.ts`, following the same pattern as every other resource — see [api/permissions.md](../api/permissions.md) for the general CASL model this reuses unchanged. No new permission action was needed: `manage` (admin-only, already CASL's wildcard) and `update` (both roles) were sufficient to express "admin writes org+locks, member writes only their own layer" without inventing an action just for this resource.

## What this does not do (yet)

- No admin settings UI exists to actually set locks or edit the org layer through a form — today this is only reachable via direct API calls. Building that UI is explicitly out of scope for this pass (see `internal-docs/ui/README.md` "Status").
- No audit trail specifically for config changes beyond whatever the general audit-event pipeline captures for the `PATCH` calls — a dedicated "config change history" view is not built.
- Locks are evaluated as a flat list scanned per-resolve, not compiled or cached — fine at today's scale (single-digit locks per workspace, resolved per session), revisit only if that assumption stops holding.
