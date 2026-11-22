import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import type { CreatePinRequest, Pin } from "@wire/types";

export class PinDto implements Pin {
  @ApiProperty({ example: "pin_64d9dea525ae84ef6f7bd361" })
  id!: Pin["id"];

  @ApiProperty()
  channelId!: string;

  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  pinnedBy!: string;

  @ApiProperty()
  createdAt!: string;
}

export class CreatePinRequestDto implements CreatePinRequest {
  @ApiProperty()
  @IsString()
  messageId!: string;
}
