import { useChannels } from "@/features/channels/hooks.js";
import { useWorkspaceShell } from "@/features/workspace-shell/workspace-shell-context.js";
import { cn } from "@/lib/cn.js";
import { useUiConfig } from "@/lib/ui-config/config-provider.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

export function ChannelListDefault(_props: SlotProps): React.JSX.Element {
  const { config } = useUiConfig();
  const Icon = useIcon();
  const { workspaceId, activeChannelId, openChannel } = useWorkspaceShell();
  const { data, isLoading, isError } = useChannels(workspaceId, {
    filter: { joined: "true" },
    per_page: 100,
  });

  const channels = data?.items ?? [];

  return (
    <div className="border-border bg-muted flex h-full w-60 flex-col border-r px-3 py-4">
      <h2 className="text-foreground mb-3 px-1 text-sm font-semibold">
        {config.branding.productName}
      </h2>
      {isLoading ? (
        <p className="text-muted-foreground px-1 text-xs">Loading…</p>
      ) : null}
      {isError ? (
        <p className="text-destructive px-1 text-xs">
          Couldn&apos;t load channels.
        </p>
      ) : null}
      {!isLoading && channels.length === 0 ? (
        <p className="text-muted-foreground px-1 text-xs">No channels yet.</p>
      ) : null}
      <ul className="flex flex-col gap-0.5">
        {channels.map((channel) => {
          const isActive = channel.id === activeChannelId;
          const hasUnread = Boolean(channel.unreadCount);
          return (
            <li key={channel.id}>
              <button
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  isActive && "bg-accent text-accent-foreground"
                )}
                onClick={() => openChannel(channel.id)}
                type="button"
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  name={channel.type === "private" ? "lock" : "hash"}
                />
                <span
                  className={cn(
                    "truncate",
                    hasUnread && !isActive && "text-foreground font-semibold"
                  )}
                >
                  {channel.name}
                </span>
                {hasUnread ? (
                  <span className="bg-primary text-primary-foreground ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold">
                    {channel.unreadCount}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
