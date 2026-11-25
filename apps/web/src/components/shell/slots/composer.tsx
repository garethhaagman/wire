import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function ComposerDefault(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();

  return (
    <div className="flex items-center gap-2 border-t border-border bg-background px-4 py-3">
      <input
        type="text"
        placeholder="Message #general"
        className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Icon name="send" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** A denser variant — same slot id, different variant, selectable purely via config. */
export function ComposerCompact(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();

  return (
    <div className="flex items-center gap-1.5 border-t border-border bg-background px-2 py-1.5">
      <input
        type="text"
        placeholder="Message..."
        className="flex-1 rounded border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground"
      >
        <Icon name="send" className="h-3 w-3" />
      </button>
    </div>
  );
}
