---
name: design-system
description: Use when building, reviewing, or discussing any UI component, color, typography, icon, spacing, shader/effect, logo, or theming decision in apps/web. Covers Wire's design system (the @wire/ui component package plus the @wire/ui-config token/customization layer): load before creating any new UI primitive, touching a className with color/spacing/type utilities, or making any visual/aesthetic choice.
version: "1.0.0"
---

# Wire design system

Wire's UI is two layers working together:

1. **`@wire/ui`** (`packages/ui/`): the component layer. A small set of primitives (`Button`, `Card`, `Input`, `Label`, plus `cn()`) built with `class-variance-authority` + Tailwind, consumed by `apps/web` as `import { Button } from "@wire/ui"`.
2. **`@wire/ui-config`** (`packages/ui-config/`): the token/customization layer. A versioned, zod-validated `UiConfig` document (colors, typography, icon pack, radius, motion, branding, layout) that's resolved **base → org → user** on the server and projected into CSS variables + Tailwind theme utilities the components in `@wire/ui` consume. See `internal-docs/ui/` for the full spec of this layer; this skill's `customization.md` summarizes the parts relevant to building UI.

**The one rule this skill exists to enforce: check what already exists in `@wire/ui` and these docs before introducing any new visual pattern: a color, a type size, an icon usage, or a whole component.** A new component that duplicates an existing primitive, or a className that hardcodes a color/size outside the token system, breaks the thing that makes Wire white-labelable (see `internal-docs/ui/README.md`): an org or user can no longer theme something that bypassed the token system.

This is enforced two ways: this skill (and `ui-component-creator`, which this skill feeds into whenever a _new_ component is on the table) for judgment calls, and `wire-ui/no-hardcoded-colors` + `wire-ui/use-design-system-primitives` + `wire-ui/require-storybook-story` (ESLint, `packages/eslint-plugin-wire-ui`) as the hard backstop that runs in CI regardless of who or what wrote the code.

## Browse it

`bun run dev` (repo root) or `make dev` starts Storybook on `http://localhost:6006` alongside the API, web app, and docs viewer. Every `@wire/ui` primitive is rendered there against `baseUiConfig`, with every variant/size permutation and Wire-specific example content, plus a light/dark toggle in the toolbar. To run just Storybook: `bun run dev` inside `packages/ui`.

## Reference docs

| Doc                                                                    | Covers                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| [references/color-palette.md](references/color-palette.md)             | The 16 semantic color roles, how they become Tailwind utilities, light/dark pairs               |
| [references/typography.md](references/typography.md)                   | Font sources, base size, type scale (`compact`/`comfortable`/`spacious`), the `display` face    |
| [references/iconography.md](references/iconography.md)                 | Icon packs (`lucide`/`phosphor`/`custom`), the `useIcon()` registry, sizing conventions         |
| [references/spacing.md](references/spacing.md)                         | Spacing scale, `radius` tokens, layout rhythm inside primitives                                 |
| [references/shaders-and-effects.md](references/shaders-and-effects.md) | When a bespoke WebGL/CSS effect is appropriate, the `AuthShader` precedent, the motion contract |
| [references/component-usage.md](references/component-usage.md)         | Every `@wire/ui` primitive today, composition patterns, anti-patterns                           |
| [references/logo-and-wordmark.md](references/logo-and-wordmark.md)     | The `branding.logo` schema, mark vs. wordmark usage, dark-mode variants, clear space            |
| [references/customization.md](references/customization.md)             | The base→org→user resolution model, locks, what a theming decision needs to respect             |

## When to load which

- About to write a `className` with a color, size, or spacing value → `color-palette.md`, `typography.md`, `spacing.md`.
- About to render an icon → `iconography.md`.
- About to build a canvas/WebGL/CSS animated effect → `shaders-and-effects.md`.
- About to use or extend an existing primitive → `component-usage.md`.
- About to touch anything under `branding.*` → `logo-and-wordmark.md`.
- Unsure whether something should be a locked org setting, a user preference, or hardcoded → `customization.md`.
- About to **create a new component** → load this skill first, then hand off to the `ui-component-creator` skill, which walks the reuse-vs-new decision explicitly.

## Good vs. bad, in one example

```tsx
// Good: reads the live theme, respects org/user customization
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Bad: hardcodes a color, ignores any org/user theme entirely
<button className="bg-indigo-600 text-white hover:bg-indigo-700">
```

The second line is exactly what `wire-ui/no-hardcoded-colors` rejects at lint time. Every reference doc below has a fuller "Good/Bad" section in the same spirit, grounded in this repo's actual schema (`packages/ui-config/src/*.ts`) and actual lint rules (`packages/eslint-plugin-wire-ui/rules/*.js`), not hypothetical guidance.
