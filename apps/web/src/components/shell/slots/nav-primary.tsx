import { useUiConfig } from "@/lib/ui-config/config-provider.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function NavPrimaryDefault(_props: SlotProps): React.JSX.Element {
  const { config } = useUiConfig();
  const Icon = useIcon();
  const logo = config.branding.logo.mark ?? config.branding.logo.full;

  return (
    <div className="border-border bg-muted flex h-full w-14 flex-col items-center gap-3 border-r py-3">
      {logo ? (
        <img
          alt={config.branding.productName}
          className="h-8 w-8 rounded-md"
          height={32}
          src={logo}
          width={32}
        />
      ) : (
        <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold">
          {config.branding.productName.slice(0, 1)}
        </div>
      )}
      <div className="text-muted-foreground mt-2 flex flex-col items-center gap-2">
        <Icon className="h-5 w-5" name="message-square" />
        <Icon className="h-5 w-5" name="search" />
        <Icon className="h-5 w-5" name="settings" />
      </div>
    </div>
  );
}
