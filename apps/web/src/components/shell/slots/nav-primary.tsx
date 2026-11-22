import { useUiConfig } from "@/lib/ui-config/config-provider.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function NavPrimaryDefault(_props: SlotProps): React.JSX.Element {
  const { config } = useUiConfig();
  const Icon = useIcon();
  const logo = config.branding.logo.mark ?? config.branding.logo.full;

  return (
    <div className="flex h-full w-14 flex-col items-center gap-3 border-r border-border bg-muted py-3">
      {logo ? (
        <img src={logo} alt={config.branding.productName} className="h-8 w-8 rounded-md" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          {config.branding.productName.slice(0, 1)}
        </div>
      )}
      <div className="mt-2 flex flex-col items-center gap-2 text-muted-foreground">
        <Icon name="message-square" className="h-5 w-5" />
        <Icon name="search" className="h-5 w-5" />
        <Icon name="settings" className="h-5 w-5" />
      </div>
    </div>
  );
}
