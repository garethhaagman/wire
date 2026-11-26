import { Link } from "react-router-dom";
import { useWorkspaceShell } from "@/features/workspace-shell/workspace-shell-context.js";
import { useUiConfig } from "@/lib/ui-config/config-provider.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function NavPrimaryDefault(_props: SlotProps): React.JSX.Element {
  const { config } = useUiConfig();
  const Icon = useIcon();
  const { workspaceId, openSearch, openSettings } = useWorkspaceShell();
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
        <Link
          aria-label="Workspace home"
          className="hover:bg-accent hover:text-accent-foreground flex h-8 w-8 items-center justify-center rounded-md"
          to={`/workspaces/${workspaceId}`}
        >
          <Icon className="h-5 w-5" name="message-square" />
        </Link>
        <button
          aria-label="Search"
          className="hover:bg-accent hover:text-accent-foreground flex h-8 w-8 items-center justify-center rounded-md"
          onClick={openSearch}
          type="button"
        >
          <Icon className="h-5 w-5" name="search" />
        </button>
        <button
          aria-label="Settings"
          className="hover:bg-accent hover:text-accent-foreground flex h-8 w-8 items-center justify-center rounded-md"
          onClick={openSettings}
          type="button"
        >
          <Icon className="h-5 w-5" name="settings" />
        </button>
      </div>
    </div>
  );
}
