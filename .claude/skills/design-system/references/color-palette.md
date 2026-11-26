# Color palette

## Source of truth

`colorRolesSchema` in `packages/ui-config/src/primitives.ts` defines 16 semantic roles, each a `{ light, dark? }` pair of raw CSS color strings (hex, `rgb()`, `oklch()` — anything valid CSS, not a closed enum):

```
background / foreground
primary / primaryForeground
secondary / secondaryForeground
accent / accentForeground
muted / mutedForeground
destructive / destructiveForeground
border
ring
card / cardForeground
```

`baseUiConfig` (`packages/ui-config/src/base-config.ts`) sets the shipped defaults — a warm off-white/near-black pair, not pure `#fff`/`#000`. These are **not** the final colors a user sees; they're the terminal fallback the resolver always has if an org hasn't branded the workspace yet.

## How a role becomes a utility class

`toTailwindThemeCss()` (`packages/ui-config/src/to-tailwind-theme.ts`) generates `apps/web/src/styles/theme.generated.css` (never hand-edited — `bun run gen:theme`), which maps each role to a Tailwind color via `@theme inline`: `primary` → `bg-primary`, `text-primary`, `border-primary`, etc. `toCssVariables()` writes the _resolved_ (base→org→user) value for the current session into `--primary` etc. on `<html>` at runtime (`applyTheme()`, `apps/web/src/lib/ui-config/apply-theme.ts`). The utility class and the live value are two separate steps — the class name is static, the color it resolves to is per-session.

This is why a role name, not a palette color, is the only thing a component is ever allowed to reference.

## Good usage

```tsx
<div className="bg-card text-card-foreground border-border border">
<Button className="bg-primary text-primary-foreground hover:bg-primary/90" />
<p className="text-muted-foreground text-sm">Helper text</p>
```

Opacity modifiers (`/90`, `/40`) are fine — they still key off the token, so they still ride the resolved color.

## Bad usage

```tsx
// Hardcoded Tailwind palette — ignores any org/user theme entirely
<div className="bg-indigo-500 text-white">

// Arbitrary value — same problem, just inline instead of a preset
<div className="bg-[#4f46e5]">

// Inline style color literal — same problem via a different door
<div style={{ backgroundColor: "#4f46e5" }}>

// Adding a brand-new color without going through colorRolesSchema
<div className="bg-brand-purple">  // "brand-purple" isn't a role; nothing resolves it per-org
```

All three are caught by `wire-ui/no-hardcoded-colors` (`packages/eslint-plugin-wire-ui/rules/no-hardcoded-colors.js`) — it's not a style preference, it's a correctness rule: these forms are indistinguishable from "this org's brand should be orange, mine is stuck purple."

## Adding a new role

If an actual new semantic role is needed (not just a new use of an existing one), it's a schema change to `colorRolesSchema`, not a one-off class. See `references/customization.md` and `internal-docs/ui/config-schema.md`'s extensibility rules — additive fields are cheap, but they go through the schema, never through a raw Tailwind color utility invented ad hoc.
