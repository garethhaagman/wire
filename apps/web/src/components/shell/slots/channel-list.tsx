import { useUiConfig } from "@/lib/ui-config/config-provider.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

const PLACEHOLDER_CHANNELS = [
  { id: "ch_general", name: "general", private: false },
  { id: "ch_eng", name: "engineering", private: false },
  { id: "ch_leads", name: "leads", private: true },
];

export function ChannelListDefault(_props: SlotProps): React.JSX.Element {
  const { config } = useUiConfig();
  const Icon = useIcon();

  return (
    <div className="border-border bg-muted flex h-full w-60 flex-col border-r px-3 py-4">
      <h2 className="text-foreground mb-3 px-1 text-sm font-semibold">
        {config.branding.productName}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {PLACEHOLDER_CHANNELS.map((channel) => (
          <li key={channel.id}>
            <button
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors"
              type="button"
            >
              <Icon
                className="h-4 w-4 shrink-0"
                name={channel.private ? "lock" : "hash"}
              />
              <span className="truncate">{channel.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
