# UI stack

## Non-negotiables

- **React 18** — already the committed client framework (`apps/web`), no change.
- **Tailwind CSS v4** — utility classes, CSS-first config (`@theme` in `src/styles/globals.css`, no `tailwind.config.js`). Chosen over CSS-in-JS specifically because v4's `@theme` block is CSS custom properties under the hood — the same mechanism the config system needs anyway (see below), so there's no second theming layer to keep in sync.
- **shadcn/ui conventions** — not a dependency, a code-generation pattern: `components.json` (in `apps/web`) configures the CLI to drop headless, copy-pasted components into `src/components/ui`, owned and editable in-repo rather than imported from `node_modules`. This matters for a config-driven app specifically: a vendored `Button` can read CSS variables and `cva` variants directly; an npm-installed component library fights you the moment you need its internals to respond to runtime config.
- **`class-variance-authority` (cva)** for component variants, `clsx` + `tailwind-merge` (via the `cn` util in `src/lib/cn.ts`) for conditional class composition — the standard shadcn pairing.
- **`lucide-react`** as the first registered icon pack (see [config-schema.md](./config-schema.md) "Icon packs") — not hardcoded as *the* icon system, just the first entry in the registry.

## Why CSS variables are the theming substrate

Tailwind utilities (`bg-primary`, `text-muted-foreground`, …) are mapped in `globals.css` to `var(--primary)`, `var(--muted-foreground)`, etc., not to literal colors. The actual values are written onto `:root` at runtime by `applyTheme()` (`apps/web/src/lib/ui-config/apply-theme.ts`), computed from the session's resolved `UiConfig`. This is what makes a config change take effect with zero rebuild: the Tailwind class names are stable across every theme; only the custom property values move. See [theming-and-layout.md](./theming-and-layout.md) for the full resolution path.

## Why not a component library (MUI, Chakra, Ant)

Those ship their own theming API, which would become a second configuration surface alongside `UiConfig` — two places to express "the primary color," one of which (the library's own theme provider) Wire's config system doesn't control. shadcn's copy-into-repo model means every component is plain Tailwind + CSS variables, so `UiConfig` is the *only* theming surface, not one of two.

## Package boundaries

| Package | Owns |
|---------|------|
| `@wire/ui-config` (`packages/ui-config`) | The zod schema, base config, resolver, CSS-variable projection — pure logic, no React, no HTTP. Importable from `apps/api` (for the resolve endpoint) and `apps/web` (for the provider) without pulling in either. |
| `apps/web/src/lib/ui-config/` | The React-specific glue: `ConfigProvider`, `applyTheme`, the icon-pack registry. Depends on `@wire/ui-config`, not the other way around. |
| `apps/web/src/components/shell/` | The slot registry and the actual slot components (nav, channel list, topbar, composer) — see [theming-and-layout.md](./theming-and-layout.md) "Slots and layouts". |
| `apps/web/src/components/ui/` | shadcn-vendored primitives (buttons, inputs, dialogs, …) as they get added — empty today beyond the generated `components.json` wiring; not part of this pass's scope. |

This mirrors the existing split in [stack/monorepo-layout.md](../stack/monorepo-layout.md) between pure `@wire/*` packages and app-specific glue — `@wire/ui-config` has the same "no framework dependency" property `@wire/domain` and `@wire/harness` have.
