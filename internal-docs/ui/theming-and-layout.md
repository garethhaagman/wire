# Theming, slots, and layouts

## Slots: the modularity boundary

A **slot** is a named mount point the app shell always knows how to render into: the primary nav rail, the channel sidebar, the message composer, and so on. The full set is the `SlotId` enum in `packages/ui-config/src/slots.ts`:

```typescript
type SlotId =
  | "nav.primary"
  | "nav.workspaceSwitcher"
  | "sidebar.channelList"
  | "topbar"
  | "composer"
  | "thread.panel"
  | "search.trigger"
  | "command.palette";
```

Config can arrange, resize, and reskin a slot, and pick which registered **variant** renders into it, but it cannot invent a new slot id, and it cannot make a required slot disappear. This is the concrete answer to "fully customizable, but a user can't break their own interface": the set of things that must exist somewhere never shrinks to zero, only their presentation does.

### Required slots

```typescript
const REQUIRED_SLOT_IDS = [
  "nav.primary",
  "sidebar.channelList",
  "composer",
] as const;
```

The resolver (`resolveUiConfig()`) checks the active layout against this list after every merge. A custom layout missing a required slot gets that slot backfilled from the base layout's config, with a warning: never silently dropped, never a 500, never a blank pane where the composer should be. Everything in `SlotId` but not in `REQUIRED_SLOT_IDS` (e.g. `command.palette`) is genuinely optional: an org or user can place it, hide it (`placement: "hidden"`), or leave it unconfigured.

### Variants are a code-side registry, not config

```typescript
// apps/web/src/components/shell/slot-registry.tsx
const registry: Partial<Record<SlotId, Record<string, SlotComponent>>> = {
  "nav.primary": { default: NavPrimaryDefault },
  "sidebar.channelList": { default: ChannelListDefault },
  topbar: { default: TopbarDefault },
  composer: { default: ComposerDefault, compact: ComposerCompact },
};
```

Config's `slot.variant` field is just a string key into this registry. Registering a new variant (a denser composer, a collapsed-by-default channel list) is additive: append an entry, existing configs are unaffected, and a config written against a newer app version that references a variant an older deployment hasn't registered yet falls back to `"default"` (`resolveSlotComponent()`) rather than failing to render. This is the same forward-compat posture as `extensions` in the schema (see [config-schema.md](./config-schema.md)), applied to "what renders" instead of "what value a field has."

## Layouts: more than one per org, admin can still pin one

A `Layout` is a named set of slot placements:

```typescript
interface Layout {
  id: string;
  name: string;
  description?: string;
  slots: Partial<
    Record<
      SlotId,
      {
        placement: SlotPlacement;
        variant: string;
        props: Record<string, unknown>;
      }
    >
  >;
}
```

`UiConfig.layouts` is an array, and `activeLayoutId` picks which one is live. Because `layouts` and `activeLayoutId` are ordinary overridable fields, a user can author and switch to their own custom layout the same way they'd change a color: there is no special "custom layout" mechanism distinct from the base mechanism. An org that wants to **enforce** one layout workspace-wide locks `activeLayoutId` (see [admin-policy.md](./admin-policy.md)), and can go further and lock `layouts` itself, which prevents even defining alternatives, not just switching to them.

`SlotPlacement` is `"sidebar-left" | "sidebar-right" | "top" | "bottom" | "floating" | "hidden"`, deliberately a small, layout-engine-agnostic set rather than pixel positions or grid coordinates, so a layout document stays meaningful across a future shell rewrite (flexbox today, something else later) as long as the placement vocabulary is still honored.

## The shell is generic

`AppShell` (`apps/web/src/components/shell/app-shell.tsx`) has no knowledge of what a "channel list" or "composer" is beyond a slot id. It reads the active layout, groups configured slots by `placement`, and renders whatever `resolveSlotComponent(slotId, variant)` returns at each placement. Swapping `activeLayoutId` (a data change) rearranges the whole shell with no code change. This was verified directly: the same shell rendered against a second, hand-authored resolved config (different theme, different composer variant) with zero code differences, producing a visibly different app (dark palette, square corners, compact composer); see the PR this doc shipped alongside for the before/after.

## How resolution becomes pixels

1. `UiConfigProvider` (`apps/web/src/lib/ui-config/config-provider.tsx`) fetches `GET /v1/workspaces/:id/ui-config` via React Query and gets back one resolved `UiConfig`.
2. `applyTheme()` (`apps/web/src/lib/ui-config/apply-theme.ts`) calls `toCssVariables()` (`@wire/ui-config`) to turn `theme.colors` into a flat `--role-name: value` map, and writes it onto `document.documentElement` along with `--radius`, `--font-sans`/`--font-mono`/`--ui-font-display` (the `font-display` utility), and `--ui-base-size`. `google` and `custom` font sources are fetched on first use (a Google Fonts stylesheet or a `FontFace`); the fallback stack renders until they arrive. Light/dark selection comes from `theme.mode` (`"light"` by default; `"system"` follows `prefers-color-scheme`); `ColorRoles` carries an optional `dark` value per role for this.
3. Tailwind's `@theme inline` block (`apps/web/src/styles/theme.generated.css`, imported by `globals.css`) maps `--color-primary` etc. to those same custom properties, so ordinary utility classes (`bg-primary`, `text-muted-foreground`) read the live, per-session theme: no component ever reads `UiConfig` directly for color. That file is generated from `colorRolesSchema` by `toTailwindThemeCss()` (`bun run gen:theme` in `apps/web`); never edit it by hand. See "Drift guards" below.
4. `createIconRegistry(config.theme.iconPack)` builds the `Icon` component the rest of the tree calls via `useIcon()`: config says _which pack_ (`{kind: "lucide"}`), the registry (`apps/web/src/lib/ui-config/icon-pack.tsx`) says what that pack actually renders. A `custom` pack resolves to an inline `<svg><use></svg>` against the org's own sprite sheet URL, so a self-hosted icon set needs no app rebuild either.
5. `AppShell` renders the active layout's slots as described above.

## No flash, no blank state

`UiConfigProvider` renders children against `baseUiConfig` immediately, before the fetch resolves: `config = data?.resolved ?? baseUiConfig`. There is no loading spinner gating the shell and no error boundary that can turn a failed config fetch into a blank page: a slow or failing API call just means the shell renders the shipped default theme until the real one arrives (or indefinitely, if the fetch never succeeds), never an unstyled or missing shell. This was the behavior confirmed when test-driving the shell with no backend running at all.

## Drift guards

The schema in `@wire/ui-config` is the single source of truth; everything that has to agree with it is either generated from it or checked against it in `bun run lint` / `bun run test`:

| Guard                                                            | Catches                                                                                                                                                                               |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:generated` (part of `bun run lint`)                       | A color role added to/removed from `colorRolesSchema` without regenerating `theme.generated.css`, i.e. a role with no `bg-<role>` utility.                                            |
| `wire-ui/no-hardcoded-colors` (`packages/eslint-plugin-wire-ui`) | Palette classes (`bg-indigo-500`, `text-white`), arbitrary colors (`bg-[#fff]`), and color literals in `style={{…}}` in `apps/web/src`: anything that would ignore an org/user theme. |
| `SlotRegistry` type (`slot-registry.tsx`)                        | A required slot (`REQUIRED_SLOT_IDS`) without a registered `default` variant: a compile error, not a blank pane.                                                                      |
| `packages/ui-config/src/ui-config.test.ts`                       | `baseUiConfig` failing its own schema, a base layout missing a required slot, a dangling `activeLayoutId`, or a color role `toCssVariables`/`toTailwindThemeCss` doesn't emit.        |

## Motion

`motion.enabled` is a global kill switch independent of any per-component animation a future feature might add: components are expected to check it (or the `data-motion` attribute `applyTheme()` sets on `<html>`) rather than hardcoding transitions. `respectReducedMotion: true` (default) means the OS-level `prefers-reduced-motion` always wins over an org/user's `motion.enabled: true`, never the reverse: accessibility preference is not something a theme is allowed to override.
