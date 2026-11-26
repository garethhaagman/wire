# The UiConfig schema

Defined in `@wire/ui-config` (`packages/ui-config/src/`) as a [zod](https://zod.dev) schema with inferred TypeScript types, the same convention `@wire/config` already uses for env parsing (see `packages/config/src/api-env.ts`). Zod, not hand-written interfaces, because this is the one config surface in the product meant to be read and written by things other than a human writing TypeScript: an admin settings UI, and eventually an AI agent editing the config on a user's behalf (see "Agent-editable" below), both need runtime validation, not just compile-time types.

## Shape

```typescript
interface UiConfig {
  schemaVersion: 1;
  theme: {
    mode: "light" | "dark" | "system"; // default "light"; "system" follows prefers-color-scheme
    colors: ColorRoles; // 16 semantic roles (background, primary, border, ...), each a {light, dark?} pair
    radius: "none" | "sm" | "md" | "lg" | "xl" | "full";
    typography: {
      sans: FontSource; // {kind: "system"} | {kind: "google", family} | {kind: "custom", family, url}
      mono: FontSource;
      display?: FontSource; // headings (e.g. auth screen title); system serif stack when unset
      baseSizePx: number; // 10-24, default 16
      scale: "compact" | "comfortable" | "spacious";
    };
    iconPack: IconPack; // {kind: "lucide"} | {kind: "phosphor"} | {kind: "custom", id, spriteUrl}
  };
  branding: {
    productName: string;
    logo: { mark?; full?; markDark?; fullDark? }; // URLs
    faviconUrl?: string;
  };
  motion: {
    enabled: boolean;
    speed: "slower" | "normal" | "faster";
    respectReducedMotion: boolean;
  };
  layouts: Layout[]; // see theming-and-layout.md
  activeLayoutId: string; // must reference a layout in `layouts`
  extensions: Record<string, unknown>; // forward-compat escape hatch, see below
}
```

Full definitions: `packages/ui-config/src/primitives.ts` (colors, typography, icon packs, branding, motion), `packages/ui-config/src/slots.ts` (layouts/slots), `packages/ui-config/src/schema.ts` (the top-level shape).

## Why every field has a default

`uiConfigSchema` validates a **complete** `UiConfig`: every field required, zod defaults filling in anything not explicitly set. The override documents stored at the org and user layers are validated against `uiConfigOverrideSchema`, which is `uiConfigSchema.deepPartial()`: every field, at every depth, optional. This split exists so "an org sets one field" and "a fully resolved config safe to render" can both be first-class, type-checked shapes, instead of one loose `Partial<UiConfig>` type doing both jobs.

The practical consequence: `baseUiConfig` (`packages/ui-config/src/base-config.ts`) is the terminal fallback for every single field. There is no field an org or user can "unset" into an invalid state; removing an override just means that field falls back to base, never to `undefined`.

## Resolution: base → org → user, server-side

Three layers, a strict precedence order, collapsed into one `UiConfig` by `resolveUiConfig()` (`packages/ui-config/src/resolve.ts`):

1. **Base**: `baseUiConfig`, shipped with the app, validates against `uiConfigSchema` on its own (it's the thing every other layer falls back to, so it can't itself be invalid).
2. **Org**: admin-authored `UiConfigOverride`, plus a `LockSet` (see [admin-policy.md](./admin-policy.md)).
3. **User**: member-authored `UiConfigOverride`, their personal preference.

Precedence is user-wins-over-org-wins-over-base, **except** where a lock exists: a locked path always resolves to the org's value (or base's, if org didn't set it), regardless of what the user has. This is a deliberate asymmetry: locks are the mechanism for "set and enforce this at a global level," not a general permission system; there's exactly one lockable layer (org) and one lock-respecting layer (user).

This resolution happens **on the server** (`apps/api/src/ui-config/`), not in the browser. The client calls `GET /v1/workspaces/:workspaceId/ui-config` and receives one already-merged `UiConfig` plus a `warnings` array; it never fetches the three layers and merges them itself. This was a deliberate choice over client-side resolution: Wire is API-first (root README's first principle), and "every capability exists in the HTTP API before any UI" means the merge/lock logic is a capability that belongs in the API, not duplicated in every client (web, future mobile, a CLI) that wants to render against a workspace's config.

## Never throws, never fully breaks

`resolveUiConfig()` has no failure mode that produces an unrenderable config:

- An invalid org or user override (fails `uiConfigOverrideSchema`) is dropped wholesale for that layer, with a warning, not partially applied, because a partially-valid partial config can resolve to a shape that's technically valid zod but doesn't make product sense (e.g. a layout object with slots but no `id`).
- `activeLayoutId` pointing at a layout that doesn't exist snaps back to the first available layout, with a warning.
- A custom layout missing one of the **required slots** (see [theming-and-layout.md](./theming-and-layout.md) "Required slots") gets that slot backfilled from the base layout, with a warning.
- If, after all of the above, the merged document somehow still fails final validation, the entire resolution falls back to `baseUiConfig`: the one guarantee that can never itself fail, because it's asserted to validate standalone.

`warnings` is surfaced in the API response (`UiConfigResource.warnings` in `@wire/types`) specifically so an admin-facing UI (or an agent editing config) can see _what_ got silently corrected, rather than a config edit failing mysteriously or a page rendering subtly wrong with no signal why.

## Extensibility rules

Three mechanisms, for three different kinds of change:

1. **New optional field, new enum member**: additive, no version bump, no migration. This is the common case and should be most schema changes.
2. **`extensions: Record<string, unknown>`**: a staging area for a setting that doesn't have a typed field yet. Namespaced by feature key (e.g. `extensions.messageDensity`). Rules (enforced by convention/review, not by the type system): keys are feature identifiers, not dot-paths; values must be JSON-serializable; once a key graduates to a typed field, it's removed from `extensions` in the same change, not kept as a duplicate. This is the mechanism an AI agent or a human can use to add UI-affecting config _today_ without a schema PR landing first.
3. **`schemaVersion` bump**: only for breaking shape changes (field removed or retyped). `UI_CONFIG_SCHEMA_VERSION` (currently `1`) is a zod `z.literal`, so a config written against a different major version fails validation outright rather than being silently misinterpreted. No migration tooling exists yet (v1 is the only version), but the field exists from the start so adding one later doesn't require touching every stored config.

## Slots are the modularity boundary, not `extensions`

A new _arrangement_ of existing UI (move the composer, resize a sidebar, pick a denser variant) is expressed through `layouts`/`slots` (see [theming-and-layout.md](./theming-and-layout.md)): config can only select among slot ids and variants the web app has registered in code, never invent one. A new _setting_ that doesn't fit an existing typed field goes in `extensions`. If you're unsure which: if it changes what renders, it's a slot/variant (code change required); if it changes a value an existing renderer reads, it's a field (typed or `extensions`).

## Agent-editable (forward-looking)

The schema is zod specifically so an internal agent generating or modifying a `UiConfigOverride` gets the same type hints and `safeParse` validation a human editing it in TypeScript would; there is no separate "agent schema." This isn't built yet (no agent tool calls into `PATCH .../ui-config` today), but the validation path (`parseOrThrow` in `apps/api/src/ui-config/ui-config.service.ts`, surfacing zod issues as `VALIDATION_ERROR` field details per [api/errors.md](../api/errors.md)) is what that integration would reuse unchanged.

## Storage

The org layer lives on `workspaces.ui_config` (jsonb) with `locks` on `workspaces.ui_config_locks` (jsonb array); the user layer on `members.ui_config_override` (jsonb), migration `1700000000001-CreateMessagingSchema`. `UiConfigService` validates layers on write and re-validates on read, so a schema change can't make a stored layer crash resolution (an invalid stored layer is skipped and logged).
