import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length } from "class-validator";
import type { Channel, CreateChannelRequest } from "@wire/types";

export class ChannelDto implements Channel {
  @ApiProperty({ example: "ch_64d9dea525ae84ef6f7bd361" })
  id!: Channel["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ["public", "private", "dm", "group_dm"] })
  type!: Channel["type"];

  @ApiProperty({ nullable: true, type: String })
  topic!: string | null;

  @ApiProperty({ nullable: true, type: String })
  purpose!: string | null;

  @ApiProperty({ nullable: true, type: String })
  archivedAt!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateChannelRequestDto implements CreateChannelRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({ enum: ["public", "private", "dm", "group_dm"] })
  @IsIn(["public", "private", "dm", "group_dm"])
  type!: Channel["type"];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;
}
