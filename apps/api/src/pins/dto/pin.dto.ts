import { ApiProperty } from "@nestjs/swagger";
import type { CreatePinRequest, Pin } from "@wire/types";
import { IsString } from "class-validator";

export class PinDto implements Pin {
  @ApiProperty({ type: String, example: "pin_64d9dea525ae84ef6f7bd361" })
  id!: Pin["id"];

  @ApiProperty({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  channelId!: string;

  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  messageId!: string;

  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  pinnedBy!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

export class CreatePinRequestDto implements CreatePinRequest {
  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  @IsString()
  messageId!: string;
}
