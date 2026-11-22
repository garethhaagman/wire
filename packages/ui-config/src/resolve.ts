import { baseUiConfig } from "./base-config.js";
import { uiConfigSchema, uiConfigOverrideSchema, type UiConfig, type UiConfigOverride } from "./schema.js";
import { REQUIRED_SLOT_IDS } from "./slots.js";
import type { LockSet } from "./locks.js";

export interface ResolveInput {
  /** Org-level override. Admin-authored; any path it sets can also be locked. */
  org?: UiConfigOverride | undefined;
  /** User-level override. Member-authored personal preference. */
  user?: UiConfigOverride | undefined;
  /** Locks the org layer has declared. Always sourced from the org layer — users cannot lock anything. */
  locks?: LockSet | undefined;
}

export interface ResolveResult {
  config: UiConfig;
  /** Non-fatal problems the resolver recovered from by falling back to base — surfaced for admin/debug UI, never thrown. */
  warnings: string[];
}

/**
 * Collapses base -> org -> user into one renderable UiConfig. Precedence is
 * strictly in that order (user wins over org, org wins over base) UNLESS a
 * path is locked, in which case the org's value wins regardless of what the
 * user set — this is the "admin can set and enforce globally" guarantee.
 *
 * This function never throws. A malformed org or user layer is dropped back
 * to the next layer down, field by field is not attempted — invalidity is
 * handled per-layer (whole override), because validating field-by-field
 * against a recursively partial schema risks resolving to a shape that
 * passes zod but makes no product sense (e.g. a layout with no required
 * slots). Reject that layer wholesale and record a warning instead.
 */
export function resolveUiConfig(input: ResolveInput): ResolveResult {
  const warnings: string[] = [];

  const org = parseOverride(input.org, "org", warnings);
  const user = parseOverride(input.user, "user", warnings);
  const locks = input.locks ?? [];

  let merged = deepMerge(deepMerge(baseUiConfig, org ?? {}), user ?? {});
  merged = applyLocks(merged, baseUiConfig, org ?? {}, locks, warnings);
  merged = enforceActiveLayoutReference(merged, warnings);
  merged = enforceRequiredSlots(merged, warnings);

  const final = uiConfigSchema.safeParse(merged);
  if (!final.success) {
    warnings.push(
      `Resolved config failed final validation (${final.error.issues.length} issue(s)); falling back to base config entirely.`,
    );
    return { config: baseUiConfig, warnings };
  }

  return { config: final.data, warnings };
}

function parseOverride(
  raw: UiConfigOverride | undefined,
  layer: "org" | "user",
  warnings: string[],
): UiConfigOverride | null {
  if (!raw) return null;
  const result = uiConfigOverrideSchema.safeParse(raw);
  if (!result.success) {
    warnings.push(`${layer} override failed validation and was ignored: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    return null;
  }
  return result.data;
}

/** Recursive plain-object merge. Arrays and primitives are replaced wholesale, never concatenated. */
function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined) return base;
  if (Array.isArray(base) || Array.isArray(override)) return override as T;
  if (!isPlainObject(base) || !isPlainObject(override)) return override as T;

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    result[key] = deepMerge((base as Record<string, unknown>)[key], value);
  }
  return result as T;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * For every lock path, overwrite the merged tree at that path with the org
 * layer's value at that path (falling back to base if org didn't set it
 * either — a lock with nothing to lock to just pins the base default).
 */
function applyLocks(
  merged: UiConfig,
  base: UiConfig,
  org: UiConfigOverride,
  locks: LockSet,
  warnings: string[],
): UiConfig {
  let result = merged;
  for (const lock of locks) {
    const segments = lock.path.split(".");
    const enforcedValue = getPath(org, segments) ?? getPath(base, segments);
    if (enforcedValue === undefined) {
      warnings.push(`Lock on "${lock.path}" has no value in org or base config; ignored.`);
      continue;
    }
    result = setPath(result, segments, enforcedValue);
  }
  return result;
}

function getPath(obj: unknown, segments: string[]): unknown {
  let current = obj;
  for (const segment of segments) {
    if (!isPlainObject(current)) return undefined;
    current = current[segment];
  }
  return current;
}

function setPath<T>(obj: T, segments: string[], value: unknown): T {
  if (segments.length === 0) return value as T;
  const [head, ...rest] = segments as [string, ...string[]];
  const base: Record<string, unknown> = isPlainObject(obj) ? obj : {};
  return {
    ...base,
    [head]: rest.length === 0 ? value : setPath(base[head], rest, value),
  } as T;
}

/** If activeLayoutId doesn't reference a real layout, snap back to the first available one. */
function enforceActiveLayoutReference(config: UiConfig, warnings: string[]): UiConfig {
  if (config.layouts.some((layout) => layout.id === config.activeLayoutId)) return config;
  const fallbackId = config.layouts[0]?.id ?? baseUiConfig.activeLayoutId;
  warnings.push(`activeLayoutId "${config.activeLayoutId}" does not match any layout; falling back to "${fallbackId}".`);
  return { ...config, activeLayoutId: fallbackId };
}

/**
 * Guarantees every required slot id is present with *some* config on the
 * active layout, by backfilling from the base layout's slot config when
 * missing. This is the concrete enforcement behind "some features need to
 * always be on, maybe in a different shape" — the shape (placement, variant)
 * is fully customizable, but the slot can never disappear from the active
 * layout entirely.
 */
function enforceRequiredSlots(config: UiConfig, warnings: string[]): UiConfig {
  const activeLayout = config.layouts.find((layout) => layout.id === config.activeLayoutId);
  if (!activeLayout) return config;

  const baseLayout = baseUiConfig.layouts[0];
  if (!baseLayout) return config;

  const missing = REQUIRED_SLOT_IDS.filter((slotId) => !activeLayout.slots[slotId]);
  if (missing.length === 0) return config;

  warnings.push(`Active layout "${activeLayout.id}" is missing required slot(s) [${missing.join(", ")}]; backfilled from base layout.`);

  const patchedSlots = { ...activeLayout.slots };
  for (const slotId of missing) {
    const fallback = baseLayout.slots[slotId];
    if (fallback) patchedSlots[slotId] = fallback;
  }

  return {
    ...config,
    layouts: config.layouts.map((layout) =>
      layout.id === activeLayout.id ? { ...layout, slots: patchedSlots } : layout,
    ),
  };
}
