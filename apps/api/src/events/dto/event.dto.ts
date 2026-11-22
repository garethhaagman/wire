import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, Length, Min } from "class-validator";
import type { PresenceEntry, WireEvent } from "@wire/types";

export class WireEventDto implements WireEvent {
  @ApiProperty({ example: "evt_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: WireEvent["id"];

  @ApiProperty({ description: "Workspace-wide replay cursor (SSE id / Last-Event-ID)" })
  seq!: number;

  @ApiProperty({ example: "message.created" })
  type!: WireEvent["type"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true, type: String })
  channelId!: string | null;

  @ApiProperty({ type: Object })
  data!: Record<string, unknown>;

  @ApiProperty()
  createdAt!: string;
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === "") return undefined;
  const values: unknown[] = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return values.filter((v): v is string => typeof v === "string" && v.length > 0);
}

export class StreamQueryDto {
  @ApiPropertyOptional({ type: [String], description: "Only deliver these event types (comma-separated or repeated)" })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiPropertyOptional({ type: [String], description: "Only deliver events for these channels" })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  channel_ids?: string[];

  @ApiPropertyOptional({ description: "Replay events after this seq first; the Last-Event-ID header takes precedence" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  after_seq?: number;
}

export class PresenceEntryDto implements PresenceEntry {
  @ApiProperty()
  memberId!: string;

  @ApiProperty({ enum: ["active"] })
  status!: "active";

  @ApiProperty()
  lastSeenAt!: string;
}

export class TypingRequestDto {
  @ApiPropertyOptional({ description: "Set when typing a thread reply" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  threadRootId?: string;
}
