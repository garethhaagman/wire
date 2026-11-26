# Component usage

## What's in `@wire/ui` today

`packages/ui/src/`:

| Component                                                           | Variants                                                                                         | Notes                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `Button`                                                            | `variant`: default / secondary / outline / ghost / destructive; `size`: default / sm / lg / icon | `cva`-driven, `forwardRef`, exports `buttonVariants` for composition           |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | n/a                                                                                              | Composed from parts, not a single component with slots-as-props                |
| `Input`                                                             | n/a                                                                                              | Native `<input>` wrapper, `aria-invalid` styling built in                      |
| `Label`                                                             | n/a                                                                                              | Native `<label>` wrapper                                                       |
| `cn()`                                                              | n/a                                                                                              | `clsx` + `tailwind-merge`; the only sanctioned way to merge/override className |

All four components share one shape: a thin `forwardRef` wrapper around the native element, styled with Tailwind utilities that are all token-backed (see `color-palette.md`, `spacing.md`), accepting `className` last so callers can extend (never fight) the base styling via `cn()`.

## Good usage: composition over new components

```tsx
// Extending Button via its own variant system
<Button variant="outline" size="sm">Cancel</Button>

// Extending via className + cn() merge semantics (tailwind-merge resolves conflicts)
<Button className="w-full">Continue</Button>

// Composing Card for a new layout need, no new component required
<Card>
  <CardHeader>
    <CardTitle>Workspace settings</CardTitle>
    <CardDescription>Manage who can access this workspace.</CardDescription>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>
```

## Bad usage: redefining instead of composing

```tsx
// A local "PrimaryButton" that just hardcodes what `variant="default"` already is
function PrimaryButton({ children }: { children: ReactNode }) {
  return (
    <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
      {children}
    </button>
  );
}
```

This is exactly what `wire-ui/use-design-system-primitives` exists to catch: a new `Button`-shaped component (by name) duplicates `@wire/ui`'s `Button`. It also silently drops everything `Button` already gets right: `focus-visible` ring, disabled state, `forwardRef`, the `sm`/`lg`/`icon` sizes.

```tsx
// Reaching for a raw <input> instead of the themed primitive
<input className="border px-2 py-1 text-sm" />;
```

Loses `aria-invalid` styling, focus ring, and token-backed border/background color in one step: looks like a cheap shortcut, is actually three regressions at once.

## When composition genuinely isn't enough

Some needs aren't expressible as a `Button`/`Card`/`Input`/`Label` variant or wrapper: a `Select`, a `Modal`, a `Switch` need different DOM semantics (listbox, dialog, native input type) entirely. That's a real new primitive, not a composition failure, see the `ui-component-creator` skill for how to decide and how to build it so it belongs in `@wire/ui` rather than becoming the next app-local duplicate.
