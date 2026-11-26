# Spacing & radius

## Source of truth

Two different mechanisms, don't conflate them:

- **Spacing** (gaps, padding) is plain Tailwind spacing utilities (`p-6`, `gap-1.5`, `px-4`) — there is no `UiConfig` spacing _scale_ field; rhythm comes from consistent utility choices inside `@wire/ui` primitives, not from a token. `typography.scale` (`compact`/`comfortable`/`spacious`) affects type size, not spacing, directly — don't assume it also scales padding.
- **Radius** is a real token: `radiusSchema` (`packages/ui-config/src/primitives.ts`) — `"none" | "sm" | "md" | "lg" | "xl" | "full"` — projected to `--radius` by `applyTheme()` and consumed via Tailwind's `rounded-*` utilities mapped to that variable.

## Good usage

```tsx
// Spacing: reuse the rhythm already established by sibling primitives
<CardHeader className="flex flex-col gap-1.5 p-6" />   // Card's own convention
<CardContent className="p-6 pt-0" />                    // consistent horizontal rhythm with the header

// Radius: use the token-backed utility, not a fixed value
<div className="rounded-md" />   // resolves to the org/user's configured `radius`
```

## Bad usage

```tsx
// Arbitrary one-off padding that doesn't match any sibling's rhythm
<div className="p-[13px]">

// Hardcoded radius — opts out of the org's radius token (e.g. a brand that locks radius: "none")
<div className="rounded-[6px]">
<div style={{ borderRadius: "6px" }}>
```

A hardcoded `rounded-[6px]` looks identical to `rounded-md` under the default config, then silently diverges the moment an org sets (or locks, see `customization.md`) `radius: "full"` for a softer brand — every component using the token updates, the one hardcoded div doesn't.

## Picking spacing values for a new component

Match the density of the primitive it sits beside before inventing a new number — `Card`'s `p-6`/`gap-1.5` and `Button`'s `h-9 px-4`/`h-8 px-3`/`h-10 px-6` (default/sm/lg) are the existing vocabulary. A new primitive should extend that vocabulary (e.g. a new `size` variant following the same step pattern), not introduce an unrelated spacing scale.
