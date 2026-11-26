import { useChannel } from "@/features/channels/hooks.js";
import { useWorkspaceShell } from "@/features/workspace-shell/workspace-shell-context.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function TopbarDefault(_props: SlotProps): React.JSX.Element {
  const Icon = useIcon();
  const { workspaceId, activeChannelId, openSearch } = useWorkspaceShell();
  const { data: channel, isLoading } = useChannel(workspaceId, activeChannelId);
  const emptyLabel =
    activeChannelId && isLoading ? "Loading channel…" : "No channel selected";

  return (
    <div className="border-border bg-background flex h-12 items-center justify-between border-b px-4">
      <div className="text-foreground flex min-w-0 items-center gap-2 text-sm font-medium">
        {channel ? (
          <>
            <Icon
              className="text-muted-foreground h-4 w-4 shrink-0"
              name={channel.type === "private" ? "lock" : "hash"}
            />
            <span className="truncate">{channel.name}</span>
            {channel.topic ? (
              <span className="text-muted-foreground truncate font-normal">
                — {channel.topic}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
      <button
        aria-label="Search"
        className="hover:bg-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        onClick={openSearch}
        type="button"
      >
        <Icon className="text-muted-foreground h-4 w-4" name="search" />
      </button>
    </div>
  );
}
