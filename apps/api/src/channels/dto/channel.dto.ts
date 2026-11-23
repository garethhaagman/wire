import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min, ValidateIf } from "class-validator";
import type {
  AddChannelMemberRequest,
  Channel,
  ChannelMember,
  CreateChannelRequest,
  MarkReadRequest,
  UpdateChannelRequest,
} from "@wire/types";

const CHANNEL_TYPES = ["public", "private", "dm", "group_dm"] as const;

export class ChannelDto implements Channel {
  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: Channel["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "general" })
  name!: string;

  @ApiProperty({ enum: CHANNEL_TYPES })
  type!: Channel["type"];

  @ApiProperty({ nullable: true, type: String, example: "Ship it 🚢" })
  topic!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "Coordinating releases and incident response" })
  purpose!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "mem_64d9dea525ae84ef6f7bd361" })
  createdBy!: string | null;

  @ApiProperty({ example: 12 })
  memberCount!: number;

  @ApiProperty({ example: 4821, description: "Highest message seq in the channel" })
  lastMessageSeq!: number;

  @ApiProperty({ nullable: true, type: String, example: "2026-01-15T09:30:00.000Z" })
  lastMessageAt!: string | null;

  @ApiProperty({ nullable: true, type: String, example: null })
  archivedAt!: string | null;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  updatedAt!: string;

  @ApiProperty({ example: true, description: "Whether the requesting member belongs to the channel" })
  isMember!: boolean;

  @ApiProperty({ nullable: true, type: Number, example: 4815 })
  lastReadSeq!: number | null;

  @ApiProperty({ nullable: true, type: Number, example: 6, description: "Unread top-level messages, capped at 100" })
  unreadCount!: number | null;
}

export class CreateChannelRequestDto implements CreateChannelRequest {
  @ApiPropertyOptional({ example: "general", description: "Required for public/private channels; ignored for dm/group_dm" })
  @ValidateIf((o: CreateChannelRequestDto) => o.type === "public" || o.type === "private")
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiProperty({ enum: CHANNEL_TYPES })
  @IsIn(CHANNEL_TYPES)
  type!: Channel["type"];

  @ApiPropertyOptional({ example: "Ship it 🚢" })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  topic?: string;

  @ApiPropertyOptional({ example: "Coordinating releases and incident response" })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  purpose?: string;

  @ApiPropertyOptional({ type: [String], description: "Initial members besides you; required for dm (1) and group_dm (2-7)" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  memberIds?: string[];
}

export class UpdateChannelRequestDto implements UpdateChannelRequest {
  @ApiPropertyOptional({ example: "general" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: "Ship it 🚢" })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  topic?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: "Coordinating releases and incident response" })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  purpose?: string | null;
}

export class ChannelMemberDto implements ChannelMember {
  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  channelId!: string;

  @ApiProperty({ example: "mem_64d9dea525ae84ef6f7bd361" })
  memberId!: string;

  @ApiProperty({ example: 4815 })
  lastReadSeq!: number;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  joinedAt!: string;
}

export class AddChannelMemberRequestDto implements AddChannelMemberRequest {
  @ApiProperty({ example: "mem_64d9dea525ae84ef6f7bd361", description: "Your own member id to join, or another member's to add them" })
  @IsString()
  @Length(1, 64)
  memberId!: string;
}

export class MarkReadRequestDto implements MarkReadRequest {
  @ApiPropertyOptional({ example: 4821, description: "Mark read up to this seq; omit to mark everything read" })
  @IsOptional()
  @IsInt()
  @Min(0)
  seq?: number;
}
