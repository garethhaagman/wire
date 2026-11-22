import type { ComponentType } from "react";
import type { REQUIRED_SLOT_IDS, SlotId } from "@wire/ui-config";
import { NavPrimaryDefault } from "./slots/nav-primary.js";
import { ChannelListDefault } from "./slots/channel-list.js";
import { TopbarDefault } from "./slots/topbar.js";
import { ComposerDefault, ComposerCompact } from "./slots/composer.js";

export interface SlotProps {
  /** Arbitrary slot-local config from `layout.slots[id].props` — see slotConfigSchema. */
  props: Record<string, unknown>;
}

type SlotComponent = ComponentType<SlotProps>;

type RequiredSlotId = (typeof REQUIRED_SLOT_IDS)[number];

/** Required slots must register a `default` variant — removing one is a compile error, not a blank pane. */
type SlotRegistry = {
  [K in RequiredSlotId]: { default: SlotComponent } & Record<string, SlotComponent>;
} & {
  [K in Exclude<SlotId, RequiredSlotId>]?: Record<string, SlotComponent>;
};

/**
 * Maps (slotId, variant) -> an actual component. This is the code-side half
 * of the slot contract described in @wire/ui-config's slots.ts: config can
 * only select among variants registered here, never invent a slot or
 * variant that doesn't exist in code. Registering a new variant is additive
 * — append an entry, no migration needed for configs that don't reference
 * it. An unregistered (slotId, variant) pair falls back to that slot's
 * "default" entry in resolveSlotComponent below, never a blank render.
 */
const registry: SlotRegistry = {
  "nav.primary": { default: NavPrimaryDefault },
  "sidebar.channelList": { default: ChannelListDefault },
  topbar: { default: TopbarDefault },
  composer: { default: ComposerDefault, compact: ComposerCompact },
};

export function resolveSlotComponent(slotId: SlotId, variant: string): SlotComponent | null {
  const variants: Record<string, SlotComponent> | undefined = registry[slotId];
  if (!variants) return null;
  return variants[variant] ?? variants.default ?? null;
}
