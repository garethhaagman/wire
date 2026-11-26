# Iconography

## Source of truth

`iconPackSchema` in `packages/ui-config/src/primitives.ts`:

```typescript
{ kind: "lucide" } | { kind: "phosphor" } | { kind: "custom", id, spriteUrl }
```

The config only ever says **which pack**; it never bundles icon assets itself. `createIconRegistry(config.theme.iconPack)` (`apps/web/src/lib/ui-config/icon-pack.tsx`) builds the actual `Icon` component the tree calls via `useIcon()`. `custom` resolves to an inline `<svg><use></svg>` against an org's self-hosted sprite sheet: swapping icon sets needs no app rebuild.

`apps/web`'s current direct dependency is `lucide-react`, matching `baseUiConfig`'s default (`{ kind: "lucide" }`).

## Good usage

```tsx
import { useIcon } from "@/lib/ui-config/icon-pack.js";

function SendButton() {
  const Icon = useIcon();
  return (
    <Button size="icon">
      <Icon name="send" />
    </Button>
  );
}
```

Icons sit inside existing primitives using the `[&_svg]:size-4 [&_svg]:shrink-0` convention already baked into `buttonVariants` (`packages/ui/src/button.tsx`): don't re-specify icon size per call site when the parent primitive already governs it.

## Bad usage

```tsx
// Importing a specific icon library directly, bypassing the configured pack
import { Send } from "lucide-react";
<Send />   // ignores iconPack: "phosphor" or iconPack: "custom" entirely for this one icon

// Inconsistent sizing fighting the primitive's own convention
<Icon name="send" className="h-[18px] w-[17px]" />
```

The first is the icon-layer equivalent of hardcoding a color: it works today because the default pack happens to be lucide, and breaks silently the day an org configures `phosphor` or a custom sprite: that one icon just won't match the rest of the UI anymore.

## When a literal SVG is fine

One-off illustration marks that aren't semantic UI icons (the Wire logo mark, a decorative pattern) are not icon-pack concerns, see `references/logo-and-wordmark.md`. The icon pack is specifically for interactive/informational iconography (buttons, nav, status), not branding assets.
