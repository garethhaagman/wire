# Typography

## Source of truth

`typographySchema` in `packages/ui-config/src/primitives.ts`:

```typescript
{
  sans: FontSource;    // {kind: "system"} | {kind: "google", family} | {kind: "custom", family, url}
  mono: FontSource;
  display?: FontSource; // headings/marketing type, e.g. the auth screen title; falls back to system serif
  baseSizePx: number;   // 10-24, default 16: the rem base everything else derives from
  scale: "compact" | "comfortable" | "spacious";
}
```

`applyTheme()` writes `--font-sans`, `--font-mono`, `--ui-font-display`, and `--ui-base-size` onto `<html>`. `google`/`custom` sources are fetched on first use (a stylesheet link or `FontFace`); the system fallback stack renders until they arrive: there is no loading flash where text is invisible.

## Good usage

```tsx
<h1 className="text-xl font-semibold tracking-tight">        {/* CardTitle, scales with --ui-base-size */}
<p className="text-muted-foreground text-sm">                {/* CardDescription */}
<span className="font-display text-3xl">Welcome back</span>  {/* display face, auth-style headline */}
```

Sizes come from Tailwind's type scale (`text-sm`, `text-xl`, ...), which is rem-based and therefore moves with `baseSizePx`: a user on `scale: "spacious"` or a larger `baseSizePx` gets a proportionally larger `text-sm`, not a fixed 14px regardless of their preference.

## Bad usage

```tsx
// Hardcoded pixel size: opts out of baseSizePx/scale entirely
<p style={{ fontSize: "13px" }}>

// Hardcoded font-family bypassing the resolved FontSource
<h1 style={{ fontFamily: "Helvetica" }}>

// A "temporary" one-off size class that isn't part of the Tailwind scale
<p className="text-[13.5px]">
```

Each of these means a user who sets a larger base size for readability, or an org that swaps in a brand typeface via `FontSource`, sees that one element not move: it silently stops being part of "the theme."

## Choosing `display` vs `sans`

Use `display` only for genuinely marketing/headline moments (the auth screen, an empty-state hero): it falls back to a system serif, which looks intentional there and wrong in dense UI (a settings panel, a table). Default to `sans` for anything that's "the app," not "the pitch."
