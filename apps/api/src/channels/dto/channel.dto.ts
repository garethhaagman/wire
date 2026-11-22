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

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: CHANNEL_TYPES })
  type!: Channel["type"];

  @ApiProperty({ nullable: true, type: String })
  topic!: string | null;

  @ApiProperty({ nullable: true, type: String })
  purpose!: string | null;

  @ApiProperty({ nullable: true, type: String })
  createdBy!: string | null;

  @ApiProperty()
  memberCount!: number;

  @ApiProperty({ description: "Highest message seq in the channel" })
  lastMessageSeq!: number;

  @ApiProperty({ nullable: true, type: String })
  lastMessageAt!: string | null;

  @ApiProperty({ nullable: true, type: String })
  archivedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ description: "Whether the requesting member belongs to the channel" })
  isMember!: boolean;

  @ApiProperty({ nullable: true, type: Number })
  lastReadSeq!: number | null;

  @ApiProperty({ nullable: true, type: Number, description: "Unread top-level messages, capped at 100" })
  unreadCount!: number | null;
}

export class CreateChannelRequestDto implements CreateChannelRequest {
  @ApiPropertyOptional({ description: "Required for public/private channels; ignored for dm/group_dm" })
  @ValidateIf((o: CreateChannelRequestDto) => o.type === "public" || o.type === "private")
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiProperty({ enum: CHANNEL_TYPES })
  @IsIn(CHANNEL_TYPES)
  type!: Channel["type"];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 250)
  topic?: string;

  @ApiPropertyOptional()
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  topic?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  @Length(0, 250)
  purpose?: string | null;
}

export class ChannelMemberDto implements ChannelMember {
  @ApiProperty()
  channelId!: string;

  @ApiProperty()
  memberId!: string;

  @ApiProperty()
  lastReadSeq!: number;

  @ApiProperty()
  joinedAt!: string;
}

export class AddChannelMemberRequestDto implements AddChannelMemberRequest {
  @ApiProperty({ description: "Your own member id to join, or another member's to add them" })
  @IsString()
  @Length(1, 64)
  memberId!: string;
}

export class MarkReadRequestDto implements MarkReadRequest {
  @ApiPropertyOptional({ description: "Mark read up to this seq; omit to mark everything read" })
  @IsOptional()
  @IsInt()
  @Min(0)
  seq?: number;
}
