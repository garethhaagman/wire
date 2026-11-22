import { z } from "zod";

/**
 * Colors are stored as raw CSS color values (hex, rgb(), oklch(), etc.), not a
 * closed enum — this is what lets a user hand the config an arbitrary brand
 * palette instead of picking from a preset list. The theme provider writes
 * each one straight into a CSS custom property, so any valid CSS color works.
 */
export const cssColorSchema = z.string().min(1).max(64);

/** A light/dark pair. Falls back to `light` for `dark` at the call site if omitted. */
export const colorModePairSchema = z.object({
  light: cssColorSchema,
  dark: cssColorSchema.optional(),
});

export type ColorModePair = z.infer<typeof colorModePairSchema>;

/**
 * Semantic color roles consumed by the shadcn/Tailwind CSS variable layer
 * (`--background`, `--primary`, etc). New roles can be appended without
 * breaking old configs because the resolver fills unset roles from the base
 * palette — see resolve.ts.
 */
export const colorRolesSchema = z.object({
  background: colorModePairSchema,
  foreground: colorModePairSchema,
  primary: colorModePairSchema,
  primaryForeground: colorModePairSchema,
  secondary: colorModePairSchema,
  secondaryForeground: colorModePairSchema,
  accent: colorModePairSchema,
  accentForeground: colorModePairSchema,
  muted: colorModePairSchema,
  mutedForeground: colorModePairSchema,
  destructive: colorModePairSchema,
  destructiveForeground: colorModePairSchema,
  border: colorModePairSchema,
  ring: colorModePairSchema,
  card: colorModePairSchema,
  cardForeground: colorModePairSchema,
});

export type ColorRoles = z.infer<typeof colorRolesSchema>;

export const fontSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("system") }),
  z.object({ kind: z.literal("google"), family: z.string().min(1) }),
  z.object({ kind: z.literal("custom"), family: z.string().min(1), url: z.string().url() }),
]);

export type FontSource = z.infer<typeof fontSourceSchema>;

export const typographySchema = z.object({
  sans: fontSourceSchema,
  mono: fontSourceSchema,
  /** Headings/marketing type (e.g. the auth screen title). Falls back to a system serif stack when unset. */
  display: fontSourceSchema.optional(),
  /** Base document font size in px; Tailwind/shadcn scale is derived from this via rem. */
  baseSizePx: z.number().min(10).max(24).default(16),
  scale: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
});

export type Typography = z.infer<typeof typographySchema>;

export const radiusSchema = z.enum(["none", "sm", "md", "lg", "xl", "full"]);

/**
 * Icon packs are referenced by id, not bundled per-config. The web app ships a
 * small registry (`iconPackRegistry` in the web app) mapping these ids to an
 * actual icon-component set (lucide, phosphor, custom SVG sprite, ...); the
 * config only ever says *which* pack, never embeds icon assets. `custom` lets
 * an org point at a self-hosted sprite sheet without a code change.
 */
export const iconPackSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("lucide") }),
  z.object({ kind: z.literal("phosphor") }),
  z.object({ kind: z.literal("custom"), id: z.string().min(1), spriteUrl: z.string().url() }),
]);

export type IconPack = z.infer<typeof iconPackSchema>;

export const logoSchema = z.object({
  /** Square mark, used in collapsed nav / favicon-adjacent slots. */
  mark: z.string().url().optional(),
  /** Full wordmark+mark lockup, used in expanded nav. */
  full: z.string().url().optional(),
  /** Dark-mode variants; falls back to the light-mode asset if unset. */
  markDark: z.string().url().optional(),
  fullDark: z.string().url().optional(),
});

export type Logo = z.infer<typeof logoSchema>;

export const motionSchema = z.object({
  /** Global kill switch — respected even if a layout requests animation. */
  enabled: z.boolean().default(true),
  speed: z.enum(["slower", "normal", "faster"]).default("normal"),
  /** Honor OS-level prefers-reduced-motion by forcing `enabled: false`. */
  respectReducedMotion: z.boolean().default(true),
});

export type Motion = z.infer<typeof motionSchema>;
