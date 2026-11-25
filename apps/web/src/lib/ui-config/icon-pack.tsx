import { createContext, useContext } from "react";
import * as Lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IconPack } from "@wire/ui-config";

/**
 * Icon packs are referenced by id in config (see @wire/ui-config primitives.ts
 * iconPackSchema), never bundled inside the config document itself. This
 * registry is the other half of that contract: it maps a pack id to an
 * actual set of icon components. Adding a new installable pack (e.g.
 * Phosphor) means adding one entry here — no schema change required, which
 * is the point of keeping "which pack" (config) and "what the pack contains"
 * (code) separate. `custom` packs resolve to a generic <img>-based renderer
 * against the org's sprite sheet instead of a bundled component set.
 */
export type IconName =
  "hash" | "lock" | "search" | "plus" | "settings" | "send" | "chevron-right" | "message-square";

const lucideIcons: Record<IconName, LucideIcon> = {
  hash: Lucide.Hash,
  lock: Lucide.Lock,
  search: Lucide.Search,
  plus: Lucide.Plus,
  settings: Lucide.Settings,
  send: Lucide.Send,
  "chevron-right": Lucide.ChevronRight,
  "message-square": Lucide.MessageSquare,
};

function CustomSpriteIcon({
  name,
  spriteUrl,
  className,
}: {
  name: IconName;
  spriteUrl: string;
  className: string;
}): React.JSX.Element {
  return (
    <svg className={className} aria-hidden="true">
      <use href={`${spriteUrl}#${name}`} />
    </svg>
  );
}

export interface IconRegistry {
  Icon: (props: { name: IconName; className?: string }) => React.JSX.Element;
}

export function createIconRegistry(pack: IconPack): IconRegistry {
  if (pack.kind === "custom") {
    return {
      Icon: ({ name, className = "" }) => (
        <CustomSpriteIcon name={name} spriteUrl={pack.spriteUrl} className={className} />
      ),
    };
  }

  // lucide and phosphor both resolve to the lucide set today — phosphor's
  // bundled set is a follow-up registration here, not a schema change.
  return {
    Icon: ({ name, className = "" }) => {
      const Component = lucideIcons[name];
      return <Component className={className} />;
    },
  };
}

const IconRegistryContext = createContext<IconRegistry | null>(null);

export const IconRegistryProvider = IconRegistryContext.Provider;

export function useIcon(): IconRegistry["Icon"] {
  const registry = useContext(IconRegistryContext);
  if (!registry) throw new Error("useIcon must be used within IconRegistryProvider");
  return registry.Icon;
}
