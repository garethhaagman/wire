import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";
import type { UpdateOrgUiConfigRequest, UpdateUserUiConfigRequest, UiConfigResource } from "@wire/types";

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
 */
export class LockDto {
  @ApiProperty({ example: "theme.colors.primary" })
  @IsString()
  path!: string;

  @ApiProperty({ enum: ["org"] })
  @IsIn(["org"])
  lockedBy!: "org";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}

export class UpdateOrgUiConfigRequestDto implements UpdateOrgUiConfigRequest {
  @ApiProperty({ description: "Deep-partial UiConfig override, validated against @wire/ui-config's uiConfigOverrideSchema." })
  @IsObject()
  override!: UpdateOrgUiConfigRequest["override"];

  @ApiProperty({ type: [LockDto] })
  @IsArray()
  locks!: UpdateOrgUiConfigRequest["locks"];
}

export class UpdateUserUiConfigRequestDto implements UpdateUserUiConfigRequest {
  @ApiProperty({ description: "Deep-partial UiConfig override, validated against @wire/ui-config's uiConfigOverrideSchema." })
  @IsObject()
  override!: UpdateUserUiConfigRequest["override"];
}

// Swagger-only schema shadow — see health-response.dto.ts for why this exists
// alongside (not instead of) the canonical @wire/types interface.
export class UiConfigResourceDto implements UiConfigResource {
  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ description: "Fully resolved UiConfig (base + org + user merged, locks applied)." })
  resolved!: UiConfigResource["resolved"];

  @ApiProperty({ type: [String] })
  warnings!: string[];
}
