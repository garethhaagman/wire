---
name: ui-component-creator
description: Use when asked to create, add, or build a new UI component (a button variant, modal, dropdown, card layout, form field, switch, badge, etc.) anywhere in apps/web. Loads the design-system skill first, checks @wire/ui for an existing or composable match, presents the reuse-vs-new trade-off to the user explicitly, and — only if a new primitive is genuinely warranted — makes and states at least 3 concrete design decisions grounded in the design-system docs, then builds the component AND its Storybook story together.
version: "2.1.0"
---

# Creating a new UI component

This skill exists because the cheapest-looking path — write a new component inline, right where it's needed — is exactly how a design system rots: a second `Button`, a `Card` with slightly different padding, a color that isn't a token. The fix isn't "never write new components," it's making the reuse-vs-new decision _explicit_ every time, instead of defaulting silently to new.

## Step 1 — load the design system first

Call the `design-system` skill before anything else. At minimum, read `packages/ui/src/index.ts` for the current export list and skim `references/component-usage.md` for composition patterns already in use.

## Step 2 — present the trade-off, don't just decide

Before writing any code, tell the user explicitly which of these applies, and why:

- **Composable today** — an existing primitive already covers this via a prop, a new `variant`/`size` in its `cva` config, or wrapping it (e.g. "this is `Button` with a new `variant: 'link'`" or "this is `Card` + existing children, no new component needed"). Propose this first whenever it's true. State what you'd add and where (e.g. "add `link` to `buttonVariants.variants.variant` in `packages/ui/src/button.tsx`").
- **Composable, but awkward** — technically possible by composing existing primitives, but the result fights the primitives' own API (e.g. faking a `Switch` out of `Input type="checkbox"` plus heavy custom CSS). Say so, and recommend the new-component path anyway, naming specifically what semantic/accessibility gap composition would leave (e.g. "a real `Switch` needs `role="switch"` + `aria-checked`, which `Input` doesn't model").
- **Genuinely new** — the need has different DOM/ARIA semantics than anything in `@wire/ui` (listbox, dialog, native control type). State this plainly: "no existing primitive models this; this needs a new component."

Do not skip straight to writing a new component when an existing one would serve — that's the exact failure mode `wire-ui/use-design-system-primitives` (the lint rule) exists to catch after the fact. Catching it here, before any code is written, is strictly better.

## Step 3 — if new, make and state ≥3 concrete design decisions

Before writing the component, make at least three specific, component-relevant design/aesthetic decisions, each citing which design-system reference doc backs it. Not generic ("it'll use theme colors") — specific to _this_ component's behavior. Examples of the right granularity:

- For a `Switch`: "On-state track uses `bg-primary`, off-state uses `bg-muted` (`color-palette.md`'s role usage, not a new color)." / "Thumb is `radius: full` regardless of the global `radius` token — switches are conventionally pill-shaped even when the rest of the UI is square (documented exception, state it as such)." / "Thumb transition respects `motion.enabled`/reduced-motion exactly like `AuthShader` does (`shaders-and-effects.md`'s motion contract), not an unconditional CSS transition."
- For a `Tooltip`: "Background uses `bg-card` + `border-border` (not a new `bg-tooltip` role — reuse `card`'s existing contrast pairing, per `color-palette.md`)." / "Font size `text-xs`, one step down from body `text-sm`, matching `CardDescription`'s existing step-down convention (`typography.md`)." / "Entrance uses the same 150ms-class transition speed as `Button`'s `transition-colors`, not a custom duration — consistency with the existing primitive timing."
- For a `Badge`: "Padding `px-2 py-0.5`, smaller than `Button`'s smallest (`sm`) size, since a badge is never interactive and should read as denser (`spacing.md`'s density-matching guidance)." / "Uses `variant` keys mirroring `Button`'s (`default`/`secondary`/`destructive`) for consistency, not a new vocabulary." / "No focus ring — it's not a native interactive element, unlike every existing `@wire/ui` primitive."

Present these to the user as a short list before or alongside the implementation — this is the "consciously present trade-offs" step, not an internal checklist to skip silently.

## Step 4 — build it inside `@wire/ui`, not app-local

New primitives go in `packages/ui/src/<name>.tsx`, added to `packages/ui/src/index.ts`, following the existing file shape exactly:

- `forwardRef` wrapping the native element or a minimal composed structure.
- `cva` for variants if there's more than one visual state, following `button.tsx`'s pattern (`variants`, `defaultVariants`).
- Props interface extends the native HTML attributes type + `VariantProps<typeof xVariants>` if applicable.
- Styling uses only token-backed utilities (`color-palette.md`, `spacing.md`) — no new hardcoded colors or sizes.
- `className` last in props, merged via `cn()` from `@wire/ui`'s own `cn.ts`.
- `displayName` set, matching the other primitives.

Never scaffold a new primitive under `apps/web/src/components/` — that's the app-local duplication this whole system exists to prevent. If something is genuinely app-specific illustration rather than a reusable UI primitive (the `AuthShader` precedent), it belongs in `apps/web/src/components/`, not `@wire/ui` — but that's a narrow exception, not the default; say explicitly which case you're in before placing the file.

## Step 5 — every new component ships with its Storybook story, same commit

A component without a story is not done. Create `packages/ui/src/<name>.stories.tsx` alongside `<name>.tsx`, before moving on. This is enforced by `wire-ui/require-storybook-story` (`packages/eslint-plugin-wire-ui/rules/require-storybook-story.js`), which fails lint if a `.tsx` file in `packages/ui/src/` exports a component with no sibling `.stories.tsx` — but write the story because it's the right thing to do, not because the rule will catch its absence otherwise.

Run `bun run dev` in `packages/ui` (or `make dev` at the repo root, which already starts it on port 6006) to see the story rendered against `baseUiConfig` before calling the component finished.

### What the story must cover

- **Every variant and size permutation** the component defines, not just the default. If `cva` defines `variant: default | secondary | outline | ghost | destructive`, there is a story (or one `render` showing all of them together, as `button.stories.tsx`'s `AllVariants` does) that renders every single one. Same for `size`, and for any other enum-like prop. A story file that only shows `Default` is incomplete.
- **Wire-specific example content, not generic placeholder text.** Use data that actually appears in this product: agent handles (`oncall-bot`), harness ids (`harness_claude-code`), webhook URLs (`https://example.com/webhooks/wire`), message/thread language, workspace/member language. Never ship a story with "Lorem ipsum," "Button," "Click me," "Text here," or `foo`/`bar`/`baz`-style filler. Look at how the component is actually used in `apps/web/src/features/**` and `apps/web/src/routes/**` for real examples to borrow before inventing new ones, exactly as `button.stories.tsx` (`Send message`, `Remove agent`, `Save draft`) and `input.stories.tsx` (`oncall-bot`, `harness_claude-code`) do.
- **No em dashes, anywhere in story text** — not in story names, `args`, `docs.description`, or example content. Use a comma, a period, or two sentences instead. This applies to every string a story renders or documents, since Storybook is itself a piece of the design system's documentation and should model the writing style the rest of the product uses.
- A `parameters.docs.description.component` on the default export, one or two sentences, stating what the component is actually used for in Wire (not a restatement of its name).

Do not add good-vs-bad comparison stories. If a usage detail is worth calling out, it belongs in the relevant `design-system` reference doc, not duplicated as a story.

### Minimal checklist before calling a new component done

1. Component file in `packages/ui/src/<name>.tsx`, exported from `index.ts`.
2. `<name>.stories.tsx` in the same directory, covering every variant/size permutation.
3. Wire-contextual example data throughout, zero generic placeholder strings.
4. Zero em dashes anywhere in the story file.
5. `bunx eslint packages/ui/src` passes (`wire-ui/require-storybook-story` and `wire-ui/no-hardcoded-colors` both clean).

## Step 6 — the lint rules are the backstop, not the first line of defense

`wire-ui/use-design-system-primitives` (`packages/eslint-plugin-wire-ui/rules/use-design-system-primitives.js`) flags a locally defined component whose name matches an existing `@wire/ui` export (or a known synonym — `Modal`/`Dialog`, `Select`/`Dropdown`, `Switch`/`Toggle`, etc). If this rule would fire on what you're about to write, that's a signal to go back to Step 2 — the "genuinely new" judgment was wrong, not a lint false positive to suppress.

`wire-ui/require-storybook-story` is the equivalent backstop for Step 5: it catches a component that got built without its story, the same way the other rule catches a component that got duplicated instead of reused. Treat a failure from either rule as a sign Step 2 or Step 5 was skipped, not as something to suppress inline.
