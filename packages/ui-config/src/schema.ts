import { z } from "zod";
import {
  colorRolesSchema,
  iconPackSchema,
  logoSchema,
  motionSchema,
  radiusSchema,
  typographySchema,
} from "./primitives.js";
import { layoutSchema } from "./slots.js";
import { extensionsSchema } from "./extensions.js";

/**
 * Bumped whenever a breaking shape change lands (field removed/retyped, not
 * additive). The resolver (resolve.ts) reads this before merge so it can
 * reject or migrate configs written against an older major shape instead of
 * silently misinterpreting them. Additive changes (new optional field, new
 * enum member) do not require a bump — see internal-docs/ui/config-schema.md
 * "Versioning and migration".
 */
export const UI_CONFIG_SCHEMA_VERSION = 1;

export const themeSchema = z.object({
  /** Which half of each color pair renders. `system` follows the OS `prefers-color-scheme`. */
  mode: z.enum(["light", "dark", "system"]).default("light"),
  colors: colorRolesSchema,
  radius: radiusSchema.default("md"),
  typography: typographySchema,
  iconPack: iconPackSchema,
});

export type Theme = z.infer<typeof themeSchema>;

export const brandingSchema = z.object({
  productName: z.string().min(1).max(60).default("Wire"),
  logo: logoSchema.default({}),
  faviconUrl: z.string().url().optional(),
});

export type Branding = z.infer<typeof brandingSchema>;

/**
 * The full shape of one UI configuration document. A single document of this
 * shape is what's stored at every layer (base, org, user) — see resolve.ts
 * for how three documents of this same shape collapse into one. Every field
 * is present with a default so a document containing only the fields a user
 * actually touched is still a *valid, independently renderable* UiConfig —
 * this is what "never fully breaks render" rests on: there is no required
 * field without a base-layer default.
 */
export const uiConfigSchema = z.object({
  schemaVersion: z.literal(UI_CONFIG_SCHEMA_VERSION).default(UI_CONFIG_SCHEMA_VERSION),
  theme: themeSchema,
  branding: brandingSchema,
  motion: motionSchema,
  layouts: z.array(layoutSchema).min(1),
  /** Which entry in `layouts` (by `id`) is active. Must reference an id present in `layouts` — enforced in resolve.ts, not expressible in zod alone across array membership. */
  activeLayoutId: z.string().min(1),
  extensions: extensionsSchema.default({}),
});

export type UiConfig = z.infer<typeof uiConfigSchema>;

/**
 * Every layer below the fully-resolved config may be partial — an org only
 * sets the handful of fields it wants to enforce, a user only sets the
 * handful they personally changed. `deepPartial` makes every nested field
 * optional recursively so "I only set `theme.colors.primary`" is a valid
 * document without needing every other field spelled out.
 */
export const uiConfigOverrideSchema = uiConfigSchema.deepPartial();

export type UiConfigOverride = z.infer<typeof uiConfigOverrideSchema>;
