import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function ComposerDefault(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();

  return (
    <div className="border-border bg-background flex items-center gap-2 border-t px-4 py-3">
      <input
        className="border-border bg-card text-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
        placeholder="Message #general"
        type="text"
      />
      <button
        className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-md transition-opacity hover:opacity-90"
        type="button"
      >
        <Icon className="h-4 w-4" name="send" />
      </button>
    </div>
  );
}

/** A denser variant — same slot id, different variant, selectable purely via config. */
export function ComposerCompact(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();

  return (
    <div className="border-border bg-background flex items-center gap-1.5 border-t px-2 py-1.5">
      <input
        className="border-border bg-card text-foreground focus:ring-ring flex-1 rounded border px-2 py-1 text-xs outline-none focus:ring-1"
        placeholder="Message..."
        type="text"
      />
      <button
        className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded"
        type="button"
      >
        <Icon className="h-3 w-3" name="send" />
      </button>
    </div>
  );
}
