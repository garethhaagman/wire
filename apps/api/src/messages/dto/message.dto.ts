import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from "class-validator";
import type { CreateMessageRequest, CreateThreadReplyRequest, Message, UpdateMessageRequest } from "@wire/types";

export class MessageDto implements Message {
  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: Message["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  channelId!: string;

  @ApiProperty({ description: "Per-channel monotonically increasing sequence" })
  seq!: number;

  @ApiProperty({ nullable: true, type: String })
  threadRootId!: string | null;

  @ApiProperty({ description: "Thread reply also shown in the channel" })
  broadcast!: boolean;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({ enum: ["human", "agent", "system"] })
  actorType!: Message["actorType"];

  @ApiProperty()
  body!: string;

  @ApiProperty()
  revision!: number;

  @ApiProperty()
  replyCount!: number;

  @ApiProperty({ nullable: true, type: String })
  lastReplyAt!: string | null;

  @ApiProperty({ type: "object", additionalProperties: { type: "integer" }, example: { "👍": 3 } })
  reactionCounts!: Record<string, number>;

  @ApiProperty({ nullable: true, type: String })
  editedAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  deletedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateMessageRequestDto implements Omit<CreateMessageRequest, "channelId"> {
  @ApiProperty()
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  threadRootId?: string;
}

export class UpdateMessageRequestDto implements UpdateMessageRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional({ description: "Expected current revision; 409 if the message has changed since" })
  @IsOptional()
  @IsInt()
  @Min(1)
  revision?: number;
}

export class CreateThreadReplyRequestDto implements CreateThreadReplyRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 8000)
  body!: string;

  @ApiPropertyOptional({ description: "Also post a copy of this reply to the channel" })
  @IsOptional()
  @IsBoolean()
  broadcastToChannel?: boolean;
}

export class ThreadReadStateDto {
  @ApiProperty()
  lastReadSeq!: number;
}
