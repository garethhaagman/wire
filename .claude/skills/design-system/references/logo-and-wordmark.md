# Logo & wordmark

## Source of truth

`logoSchema` in `packages/ui-config/src/primitives.ts`, nested under `branding`:

```typescript
branding: {
  productName: string;
  logo: {
    mark?: string;      // square mark — collapsed nav, favicon-adjacent slots
    full?: string;       // full wordmark+mark lockup — expanded nav
    markDark?: string;   // dark-mode variant of `mark`; falls back to `mark` if unset
    fullDark?: string;   // dark-mode variant of `full`; falls back to `full` if unset
  };
  faviconUrl?: string;
}
```

All four logo fields are URLs, not bundled assets — an org's branding is entirely data, resolved the same base→org→user way as colors (see `customization.md`). `baseUiConfig` ships `productName: "Wire"` and an empty `logo: {}` — there is no default Wire logo asset baked into the base config; a workspace with no org branding set shows the product name as text, not a missing-image icon.

## Good usage

```tsx
function Logo({ collapsed }: { collapsed: boolean }) {
  const { branding } = useUiConfig();
  const isDark = useIsDarkMode();
  const mark = isDark
    ? (branding.logo.markDark ?? branding.logo.mark)
    : branding.logo.mark;
  const full = isDark
    ? (branding.logo.fullDark ?? branding.logo.full)
    : branding.logo.full;
  const src = collapsed ? mark : full;

  return src ? (
    <img src={src} alt={branding.productName} className="h-6" />
  ) : (
    <span className="font-display text-lg font-semibold">
      {branding.productName}
    </span>
  );
}
```

Two things this gets right: it falls back to the light variant when no dark-specific asset is set (per the schema's own fallback contract), and it falls back to **text** (`productName`), never a hardcoded Wire logo file, when no asset is configured at all — a white-labeled workspace with its own name and no uploaded mark yet should see its own name, not Wire's brand.

## Bad usage

```tsx
// Hardcoding Wire's own logo path, ignoring branding.logo entirely
<img src="/assets/wire-logo.svg" alt="Wire" />

// Using `full` where `mark` belongs (or vice versa) — breaks collapsed nav layout
<img src={branding.logo.full} className="h-6 w-6" />   // squeezes a wide lockup into a square slot

// No dark-mode fallback — blank/invisible logo on an org that only set the light asset
<img src={isDark ? branding.logo.markDark : branding.logo.mark} />   // markDark undefined -> broken img
```

The first defeats white-labeling at the root: every workspace, branded or not, would show Wire's own mark. The third is a real visual bug any org that hasn't uploaded a separate dark-mode asset will hit — the schema's documented fallback (`markDark` falls back to `mark`) has to be applied in code; it isn't automatic just because the field is optional.

## Clear space & minimum size (product convention, not yet schema-enforced)

Treat `mark` as needing a minimum rendered size around `20px` (anything smaller and most marks become illegible) and `full` as needing horizontal clear space roughly equal to the mark's own width on either side before adjacent nav content starts — there's no schema field enforcing this today, so it's a layout-code responsibility wherever `branding.logo` is rendered, not something an org's uploaded asset can get wrong on its own.
