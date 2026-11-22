import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, Length } from "class-validator";
import type { CreateMessageRequest, CreateThreadReplyRequest, Message } from "@wire/types";

export class MessageDto implements Message {
  @ApiProperty({ example: "msg_64d9dea525ae84ef6f7bd361" })
  id!: Message["id"];

  @ApiProperty()
  channelId!: string;

  @ApiProperty({ nullable: true, type: String })
  threadRootId!: string | null;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({ enum: ["human", "agent", "system"] })
  actorType!: Message["actorType"];

  @ApiProperty()
  body!: string;

  @ApiProperty()
  revision!: number;

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
