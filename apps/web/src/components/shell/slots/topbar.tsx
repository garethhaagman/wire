import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function TopbarDefault(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();

  return (
    <div className="border-border bg-background flex h-12 items-center justify-between border-b px-4">
      <div className="text-foreground flex items-center gap-2 text-sm font-medium">
        <Icon className="text-muted-foreground h-4 w-4" name="hash" />
        general
      </div>
      <Icon className="text-muted-foreground h-4 w-4" name="search" />
    </div>
  );
}
