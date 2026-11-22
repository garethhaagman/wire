import { z } from "zod";

/**
 * A slot is a named mount point the app shell always renders into — e.g. the
 * channel sidebar, the message composer, the top bar. Slots are the unit of
 * "modularity" in this config: a user can move a slot, resize it, restyle it,
 * or swap *which variant* of it renders, but the registered slot ids below
 * are the full set the shell knows how to mount. Config cannot invent new
 * slot ids (that requires a code change registering a new slot + variant in
 * the web app) — it can only arrange, size, and pick variants for the slots
 * that exist. This is the mechanism behind "fully customizable, can't break
 * your own interface": the set of *things that must exist somewhere* never
 * shrinks to zero, only their presentation does.
 */
export const slotIdSchema = z.enum([
  "nav.primary",
  "nav.workspaceSwitcher",
  "sidebar.channelList",
  "topbar",
  "composer",
  "thread.panel",
  "search.trigger",
  "command.palette",
]);

export type SlotId = z.infer<typeof slotIdSchema>;

/**
 * Slots an app shell must always mount *somewhere*, in some variant, for the
 * product to function. The resolver (resolve.ts) hard-fails validation if a
 * layout's `slots` map is missing any of these — see REQUIRED_SLOT_IDS.
 * Everything in slotIdSchema but not here is optional (e.g. `command.palette`
 * can be fully disabled by an org/user that doesn't want it).
 */
export const REQUIRED_SLOT_IDS = [
  "nav.primary",
  "sidebar.channelList",
  "composer",
] as const satisfies readonly SlotId[];

export const slotPlacementSchema = z.enum([
  "sidebar-left",
  "sidebar-right",
  "top",
  "bottom",
  "floating",
  "hidden",
]);

export type SlotPlacement = z.infer<typeof slotPlacementSchema>;

/**
 * Per-slot configuration. `variant` selects among the component implementations
 * the web app registers for that slot id (e.g. `composer` might register
 * "default" | "compact" | "command-first"); unknown variants fall back to
 * "default" at resolve time rather than failing closed, so a config authored
 * against a newer app version degrades gracefully on an older one.
 */
export const slotConfigSchema = z.object({
  placement: slotPlacementSchema.default("sidebar-left"),
  variant: z.string().min(1).default("default"),
  /** Slot-local style overrides; intentionally loose — see extensions.ts. */
  props: z.record(z.string(), z.unknown()).default({}),
});

export type SlotConfig = z.infer<typeof slotConfigSchema>;

export const layoutSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  slots: z.record(slotIdSchema, slotConfigSchema),
});

export type Layout = z.infer<typeof layoutSchema>;
