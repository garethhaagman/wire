import { z } from "zod";

/**
 * A lock freezes one dot-path of the config tree at the value set by the
 * layer that declared the lock, preventing any lower-precedence layer from
 * overriding it. This is the mechanism behind "set and enforce this at a
 * global level by an admin": an org admin can lock `theme.colors.primary` to
 * the company brand color while leaving every other field user-editable, or
 * lock `activeLayoutId` to force one layout workspace-wide while still
 * letting users pick their own `theme`.
 *
 * Paths use dot notation matching the UiConfig shape, e.g.:
 *   "theme.colors.primary"
 *   "activeLayoutId"
 *   "layouts"              (locks the entire layouts list — no custom layouts)
 *
 * A prefix lock (no wildcard syntax needed) locks everything beneath it:
 * locking "theme" locks every field nested under theme. See resolve.ts for
 * how prefix matching is applied during merge.
 */
export const configPathSchema = z.string().min(1);

export const lockSchema = z.object({
  path: configPathSchema,
  /** Who imposed the lock — currently only "org" exists as a lockable layer. */
  lockedBy: z.literal("org"),
  reason: z.string().max(280).optional(),
});

export type Lock = z.infer<typeof lockSchema>;

export const lockSetSchema = z.array(lockSchema);

export type LockSet = z.infer<typeof lockSetSchema>;
