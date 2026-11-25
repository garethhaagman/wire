import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { PresenceEntry, WireEvent } from "@wire/types";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from "class-validator";

export class WireEventDto implements WireEvent {
  @ApiProperty({ example: "evt_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: WireEvent["id"];

  @ApiProperty({
    example: 48_213,
    description: "Workspace-wide replay cursor (SSE id / Last-Event-ID)",
  })
  seq!: number;

  @ApiProperty({ example: "message.created" })
  type!: WireEvent["type"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y",
  })
  channelId!: string | null;

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { messageId: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y", body: "Hello!" },
    description: "Event-type-specific payload, shape depends on `type`.",
  })
  data!: Record<string, unknown>;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

function toStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }
  let values: unknown[];
  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === "string") {
    values = value.split(",");
  } else {
    values = [];
  }
  return values.filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
}

export class StreamQueryDto {
  @ApiPropertyOptional({
    type: [String],
    description: "Only deliver these event types (comma-separated or repeated)",
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: "Only deliver events for these channels",
  })
  @IsOptional()
  @Transform(({ value }) => toStringArray(value))
  @IsArray()
  @IsString({ each: true })
  channel_ids?: string[];

  @ApiPropertyOptional({
    example: 48_000,
    description:
      "Replay events after this seq first; the Last-Event-ID header takes precedence",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  after_seq?: number;
}

export class PresenceEntryDto implements PresenceEntry {
  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  memberId!: string;

  @ApiProperty({ enum: ["active"] })
  status!: "active";

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  lastSeenAt!: string;
}

export class TypingRequestDto {
  @ApiPropertyOptional({
    example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y",
    description: "Set when typing a thread reply",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  threadRootId?: string;
}
