import type { ReactNode } from "react";
import type { Layout, SlotId, SlotPlacement } from "@wire/ui-config";
import { useUiConfig } from "@/lib/ui-config/config-provider.js";
import { resolveSlotComponent } from "./slot-registry.js";

/**
 * Renders the active layout's slots by placement. This is the piece that
 * makes "user-settable layouts, not just one per org" real: swapping
 * `activeLayoutId` (user pref, unless locked by an org policy) changes which
 * `Layout` document drives this render, with zero code change. See
 * internal-docs/ui/theming-and-layout.md "The shell is generic".
 */
export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  const { config } = useUiConfig();
  const layout = config.layouts.find((l) => l.id === config.activeLayoutId);

  if (!layout) {
    // Guaranteed not to happen post-resolve (resolveUiConfig snaps dangling
    // activeLayoutId back to a real layout) — this is a last-resort guard,
    // not an expected path.
    return <div className="flex h-dvh items-center justify-center text-muted-foreground">No layout available.</div>;
  }

  return (
    <div className="flex h-dvh w-full bg-background text-foreground" data-motion-speed={config.motion.speed}>
      {renderSlotsFor(layout, "sidebar-left")}
      <div className="flex min-w-0 flex-1 flex-col">
        {renderSlotsFor(layout, "top")}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        {renderSlotsFor(layout, "bottom")}
      </div>
      {renderSlotsFor(layout, "sidebar-right")}
      {renderSlotsFor(layout, "floating")}
    </div>
  );
}

function renderSlotsFor(layout: Layout, placement: SlotPlacement): ReactNode {
  const entries = Object.entries(layout.slots) as [SlotId, Layout["slots"][SlotId]][];
  return entries
    .filter(([, slot]) => slot?.placement === placement)
    .map(([slotId, slot]) => {
      if (!slot) return null;
      const Component = resolveSlotComponent(slotId, slot.variant);
      if (!Component) return null;
      return <Component key={slotId} props={slot.props} />;
    });
}
