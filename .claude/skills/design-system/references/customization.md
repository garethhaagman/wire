# Customization model

Full spec: `internal-docs/ui/theming-and-layout.md`, `internal-docs/ui/config-schema.md`, `internal-docs/ui/admin-policy.md`. This doc is the subset a component/UI decision needs.

## Base → org → user, resolved server-side

Every visual property in `UiConfig` is overridable at three layers, in this precedence (highest wins): **user** > **org** > **base**, except where an org **lock** exists, in which case org (or base, if org didn't set it) always wins regardless of the user's value. Resolution happens once, server-side (`resolveUiConfig()`, `packages/ui-config/src/resolve.ts`); the client renders only the already-merged result, never the three layers separately.

Practical implication for writing UI code: **a component never knows or cares which layer a value came from.** It reads `bg-primary` or `useUiConfig().branding.productName` the same way regardless of whether that value is the shipped default, an org's brand color, or a user's personal preference. If you find yourself writing `if (isOrgOverride) {...}` in a component, that's a sign the resolution boundary is being violated: that logic belongs server-side in the resolver, not in the render path.

## Locks: enforcement, not just defaults

A **lock** (`path` + `lockedBy: "org"`) makes a field non-overridable by the user layer, unconditionally, applied _after_ the merge. `"theme"` locks everything under `theme.*` in one lock: dot-path locks are prefix locks, not single-field locks. When building something that reads `UiConfig`, don't assume a field is user-adjustable just because the type allows writing to it: `PATCH .../ui-config/me` can succeed and still have zero visible effect if that path is locked.

## What this means for new components

When a new primitive has a visual property that _could_ reasonably vary (a color, a size, a density), the default assumption should be: **it already does**, by reading the resolved config through existing tokens (`bg-*`, `text-*`, `--radius`, `useIcon()`, `useUiConfig()`), not by adding a new prop for "what color should this be" that only your component understands. A one-off `color` prop on a single component re-invents a worse, unlocked, un-resolved version of what `colorRolesSchema` + locks already provide for everything else.

## Good usage

```tsx
// Reads resolved config: automatically respects base/org/user + any lock
function WorkspaceBadge() {
  const { branding } = useUiConfig();
  return <Badge>{branding.productName}</Badge>;
}
```

## Bad usage

```tsx
// A component-local override mechanism that bypasses resolution/locks entirely
function WorkspaceBadge({ brandColor = "#4f46e5" }: { brandColor?: string }) {
  return <span style={{ color: brandColor }}>...</span>;
}
```

`brandColor` here is a second, parallel theming system living on one component's props: it can't be locked by an org, doesn't show up in `GET .../ui-config`, and drifts the instant the org's real brand color changes anywhere else in the app.

## New field vs. `extensions` vs. hardcoded

Per `config-schema.md`'s extensibility rules: a genuinely new themeable property is an additive schema field (common case) or, if it's not ready for a typed field yet, a namespaced key under `extensions` (e.g. `extensions.messageDensity`), never a hardcoded value or a component-local prop standing in for what should be a config field. If a visual choice should vary by org/user at all, it belongs in one of these two places, not nowhere.
