import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function TopbarDefault(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon name="hash" className="h-4 w-4 text-muted-foreground" />
        general
      </div>
      <Icon name="search" className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
