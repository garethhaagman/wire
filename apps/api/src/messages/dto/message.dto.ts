import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from "class-validator";
import type {
  CreateMessageRequest,
  CreateThreadReplyRequest,
  Message,
  UpdateMessageRequest,
} from "@wire/types";

export class MessageDto implements Message {
  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: Message["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  channelId!: string;

  @ApiProperty({ description: "Per-channel monotonically increasing sequence", example: 42 })
  seq!: number;

  @ApiProperty({ nullable: true, type: String, example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  threadRootId!: string | null;

  @ApiProperty({ description: "Thread reply also shown in the channel", example: false })
  broadcast!: boolean;

  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  actorId!: string;

  @ApiProperty({ enum: ["human", "agent", "system"] })
  actorType!: Message["actorType"];

  @ApiProperty({ example: "Shipping the v2 config schema today." })
  body!: string;

  @ApiProperty({ example: 1 })
  revision!: number;

  @ApiProperty({ example: 3 })
  replyCount!: number;

  @ApiProperty({ nullable: true, type: String, example: "2026-01-15T09:30:00.000Z" })
  lastReplyAt!: string | null;

  @ApiProperty({ type: "object", additionalProperties: { type: "integer" }, example: { "👍": 3 } })
  reactionCounts!: Record<string, number>;

  @ApiProperty({ nullable: true, type: String, example: "2026-01-15T09:35:00.000Z" })
  editedAt!: string | null;

  @ApiProperty({ nullable: true, type: String, example: null })
  deletedAt!: string | null;

  @ApiProperty({ example: "2026-01-15T09:00:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T09:35:00.000Z" })
  updatedAt!: string;
}

export class CreateMessageRequestDto implements Omit<CreateMessageRequest, "channelId"> {
  @ApiProperty({ example: "Shipping the v2 config schema today." })
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  @IsOptional()
  @IsString()
  threadRootId?: string;
}

export class UpdateMessageRequestDto implements UpdateMessageRequest {
  @ApiProperty({ example: "Shipping the v2 config schema today — now with examples." })
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional({
    description: "Expected current revision; 409 if the message has changed since",
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  revision?: number;
}

export class CreateThreadReplyRequestDto implements CreateThreadReplyRequest {
  @ApiProperty({ example: "Agreed, let's go with option B." })
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional({
    description: "Also post a copy of this reply to the channel",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  broadcastToChannel?: boolean;
}

export class ThreadReadStateDto {
  @ApiProperty({ example: 42 })
  lastReadSeq!: number;
}
