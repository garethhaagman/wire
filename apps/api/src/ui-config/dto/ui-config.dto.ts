import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import type {
  UpdateOrgUiConfigRequest,
  UpdateUserUiConfigRequest,
  UiConfigResource,
} from "@wire/types";
import type {
  Branding,
  ColorModePair,
  ColorRoles,
  FontSource,
  IconPack,
  Layout,
  Logo,
  Motion,
  SlotConfig,
  SlotId,
  SlotPlacement,
  Theme,
  Typography,
  UiConfig,
} from "@wire/ui-config";

/**
 * Deviation from the usual per-field class-validator DTO convention (see
 * workspace.dto.ts / member.dto.ts): `override` is an arbitrary-depth
 * recursive tree (UiConfigOverride from @wire/ui-config) with dozens of
 * optional nested fields. Hand-writing class-validator decorators for every
 * nested path would duplicate the zod schema and drift from it the moment
 * either changes. Instead this DTO only validates shape-at-the-door (is it an
 * object, is `locks` an array) and UiConfigService re-validates the payload
 * against `uiConfigOverrideSchema`/`lockSchema` from @wire/ui-config before
 * ever merging it — that is the actual source of truth for field-level
 * validation, not this class. See internal-docs/ui/config-schema.md.
 *
 * The *response* side (UiConfigDto and everything it nests, below) is not
 * under this deviation: `resolved` is always a complete, fully-merged
 * UiConfig with every field present (see schema.ts — "never fully breaks
 * render"), so it has a fixed, finite shape worth giving Swagger consumers
 * real schema + example for, unlike the open-ended partial `override`.
 */
export class LockDto {
  @ApiProperty({ example: "theme.colors.primary" })
  @IsString()
  path!: string;

  @ApiProperty({ enum: ["org"] })
  @IsIn(["org"])
  lockedBy!: "org";

  @ApiProperty({ required: false, example: "Brand color is fixed company-wide." })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}

export class UpdateOrgUiConfigRequestDto implements UpdateOrgUiConfigRequest {
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "Deep-partial UiConfig override, validated against @wire/ui-config's uiConfigOverrideSchema.",
    example: { theme: { colors: { primary: { light: "#2563eb", dark: "#60a5fa" } } } },
  })
  @IsObject()
  override!: UpdateOrgUiConfigRequest["override"];

  @ApiProperty({ type: [LockDto] })
  @IsArray()
  locks!: UpdateOrgUiConfigRequest["locks"];
}

export class UpdateUserUiConfigRequestDto implements UpdateUserUiConfigRequest {
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    description: "Deep-partial UiConfig override, validated against @wire/ui-config's uiConfigOverrideSchema.",
    example: { theme: { mode: "dark" } },
  })
  @IsObject()
  override!: UpdateUserUiConfigRequest["override"];
}

export class ColorModePairDto implements ColorModePair {
  @ApiProperty({ example: "#151514", description: "Any valid CSS color (hex, rgb(), oklch(), ...)." })
  light!: string;

  @ApiProperty({ required: false, example: "#ecebe8", description: "Falls back to `light` when unset." })
  dark?: string;
}

export class ColorRolesDto implements ColorRoles {
  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#f2f1ed", dark: "#0d0d0c" } })
  background!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#151514", dark: "#ecebe8" } })
  foreground!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#151514", dark: "#ecebe8" } })
  primary!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#ffffff", dark: "#151514" } })
  primaryForeground!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#efeeea", dark: "#1c1c1a" } })
  secondary!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#151514", dark: "#ecebe8" } })
  secondaryForeground!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#eceae5", dark: "#232320" } })
  accent!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#151514", dark: "#ecebe8" } })
  accentForeground!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#f7f6f3", dark: "#161614" } })
  muted!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#6c6b66", dark: "#9c9b96" } })
  mutedForeground!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#c4322b", dark: "#f0786f" } })
  destructive!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#ffffff", dark: "#151514" } })
  destructiveForeground!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#e3e1db", dark: "#2a2a27" } })
  border!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#151514", dark: "#ecebe8" } })
  ring!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#ffffff", dark: "#131312" } })
  card!: ColorModePair;

  @ApiProperty({ type: () => ColorModePairDto, example: { light: "#151514", dark: "#ecebe8" } })
  cardForeground!: ColorModePair;
}

/**
 * fontSourceSchema is a zod discriminatedUnion on `kind`; Swagger has no
 * native discriminated-union concept for a single flattened class, so this
 * is represented as `oneOf` three sibling schemas (registered via
 * @ApiExtraModels on UiConfigDto below, since nest/swagger only resolves
 * $refs for models it has seen referenced by a decorated property or
 * registered explicitly).
 */
export class SystemFontSourceDto {
  @ApiProperty({ enum: ["system"] })
  kind!: "system";
}

export class GoogleFontSourceDto {
  @ApiProperty({ enum: ["google"] })
  kind!: "google";

  @ApiProperty({ example: "Inter" })
  family!: string;
}

export class CustomFontSourceDto {
  @ApiProperty({ enum: ["custom"] })
  kind!: "custom";

  @ApiProperty({ example: "Söhne" })
  family!: string;

  @ApiProperty({ example: "https://assets.example.com/fonts/sohne.woff2" })
  url!: string;
}

export class TypographyDto implements Typography {
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SystemFontSourceDto) },
      { $ref: getSchemaPath(GoogleFontSourceDto) },
      { $ref: getSchemaPath(CustomFontSourceDto) },
    ],
    example: { kind: "system" },
  })
  sans!: FontSource;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(SystemFontSourceDto) },
      { $ref: getSchemaPath(GoogleFontSourceDto) },
      { $ref: getSchemaPath(CustomFontSourceDto) },
    ],
    example: { kind: "system" },
  })
  mono!: FontSource;

  @ApiProperty({
    required: false,
    oneOf: [
      { $ref: getSchemaPath(SystemFontSourceDto) },
      { $ref: getSchemaPath(GoogleFontSourceDto) },
      { $ref: getSchemaPath(CustomFontSourceDto) },
    ],
    description: "Headings/marketing type. Falls back to a system serif stack when unset.",
  })
  display?: FontSource;

  @ApiProperty({ minimum: 10, maximum: 24, example: 16, description: "Base document font size in px." })
  baseSizePx!: number;

  @ApiProperty({ enum: ["compact", "comfortable", "spacious"], example: "comfortable" })
  scale!: "compact" | "comfortable" | "spacious";
}

export class LucideIconPackDto {
  @ApiProperty({ enum: ["lucide"] })
  kind!: "lucide";
}

export class PhosphorIconPackDto {
  @ApiProperty({ enum: ["phosphor"] })
  kind!: "phosphor";
}

export class CustomIconPackDto {
  @ApiProperty({ enum: ["custom"] })
  kind!: "custom";

  @ApiProperty({ example: "acme-sprite" })
  id!: string;

  @ApiProperty({ example: "https://assets.example.com/icons/acme-sprite.svg" })
  spriteUrl!: string;
}

export class LogoDto implements Logo {
  @ApiProperty({ required: false, example: "https://assets.example.com/logo/mark.svg" })
  mark?: string;

  @ApiProperty({ required: false, example: "https://assets.example.com/logo/full.svg" })
  full?: string;

  @ApiProperty({ required: false, example: "https://assets.example.com/logo/mark-dark.svg" })
  markDark?: string;

  @ApiProperty({ required: false, example: "https://assets.example.com/logo/full-dark.svg" })
  fullDark?: string;
}

export class ThemeDto implements Theme {
  @ApiProperty({ enum: ["light", "dark", "system"], example: "light" })
  mode!: "light" | "dark" | "system";

  @ApiProperty({ type: () => ColorRolesDto })
  colors!: ColorRoles;

  @ApiProperty({ enum: ["none", "sm", "md", "lg", "xl", "full"], example: "md" })
  radius!: "none" | "sm" | "md" | "lg" | "xl" | "full";

  @ApiProperty({ type: () => TypographyDto })
  typography!: Typography;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(LucideIconPackDto) },
      { $ref: getSchemaPath(PhosphorIconPackDto) },
      { $ref: getSchemaPath(CustomIconPackDto) },
    ],
    example: { kind: "lucide" },
  })
  iconPack!: IconPack;
}

export class BrandingDto implements Branding {
  @ApiProperty({ example: "Wire" })
  productName!: string;

  @ApiProperty({ type: () => LogoDto })
  logo!: Logo;

  @ApiProperty({ required: false, example: "https://assets.example.com/favicon.ico" })
  faviconUrl?: string;
}

export class MotionDto implements Motion {
  @ApiProperty({ example: true, description: "Global kill switch, respected even if a layout requests animation." })
  enabled!: boolean;

  @ApiProperty({ enum: ["slower", "normal", "faster"], example: "normal" })
  speed!: "slower" | "normal" | "faster";

  @ApiProperty({ example: true, description: "Honor OS-level prefers-reduced-motion by forcing `enabled: false`." })
  respectReducedMotion!: boolean;
}

const SLOT_ID_EXAMPLE: SlotId = "nav.primary";

export class SlotConfigDto implements SlotConfig {
  @ApiProperty({
    enum: ["sidebar-left", "sidebar-right", "top", "bottom", "floating", "hidden"],
    example: "sidebar-left",
  })
  placement!: SlotPlacement;

  @ApiProperty({ example: "default", description: "Selects among the component variants the web app registers for this slot id." })
  variant!: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: {},
    description: "Slot-local style overrides; intentionally loose, see @wire/ui-config's extensions.ts.",
  })
  props!: Record<string, unknown>;
}

export class LayoutDto implements Layout {
  @ApiProperty({ example: "default" })
  id!: string;

  @ApiProperty({ example: "Default" })
  name!: string;

  @ApiProperty({ required: false, example: "Standard three-pane layout: nav rail, channel sidebar, main content." })
  description?: string;

  @ApiProperty({
    type: "object",
    additionalProperties: { $ref: getSchemaPath(SlotConfigDto) },
    description: `Keyed by slot id (one of: nav.primary, nav.workspaceSwitcher, sidebar.channelList, topbar, composer, thread.panel, search.trigger, command.palette). Must include every required slot: nav.primary, sidebar.channelList, composer.`,
    example: {
      [SLOT_ID_EXAMPLE]: { placement: "sidebar-left", variant: "default", props: {} },
      composer: { placement: "bottom", variant: "default", props: {} },
    },
  })
  slots!: Record<SlotId, SlotConfig>;
}

export class UiConfigDto implements UiConfig {
  @ApiProperty({ example: 1, description: "Bumped on breaking shape changes; see @wire/ui-config's schema.ts." })
  schemaVersion!: 1;

  @ApiProperty({ type: () => ThemeDto })
  theme!: Theme;

  @ApiProperty({ type: () => BrandingDto })
  branding!: Branding;

  @ApiProperty({ type: () => MotionDto })
  motion!: Motion;

  @ApiProperty({ type: [LayoutDto] })
  layouts!: Layout[];

  @ApiProperty({ example: "default", description: "Which entry in `layouts` (by `id`) is active." })
  activeLayoutId!: string;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: {},
    description: "Forward-compatibility staging area for fields not yet promoted to the typed schema, see @wire/ui-config's extensions.ts.",
  })
  extensions!: Record<string, unknown>;
}

// Swagger-only schema shadow — see health-response.dto.ts for why this exists
// alongside (not instead of) the canonical @wire/types interface.
@ApiExtraModels(
  SystemFontSourceDto,
  GoogleFontSourceDto,
  CustomFontSourceDto,
  LucideIconPackDto,
  PhosphorIconPackDto,
  CustomIconPackDto,
)
export class UiConfigResourceDto implements UiConfigResource {
  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ type: () => UiConfigDto, description: "Fully resolved UiConfig (base + org + user merged, locks applied)." })
  resolved!: UiConfigResource["resolved"];

  @ApiProperty({ type: [String] })
  warnings!: string[];
}
