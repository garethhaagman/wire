import { ApiProperty } from "@nestjs/swagger";
import type { CreateReactionRequest, Reaction } from "@wire/types";
import { IsString, Length } from "class-validator";

export class ReactionDto implements Reaction {
  @ApiProperty({ example: "rxn_64d9dea525ae84ef6f7bd361" })
  id!: Reaction["id"];

  @ApiProperty({ example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  messageId!: string;

  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  actorId!: string;

  @ApiProperty({ example: "👍" })
  emoji!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

export class CreateReactionRequestDto implements CreateReactionRequest {
  @ApiProperty({ example: "👍" })
  @IsString()
  @Length(1, 32)
  emoji!: string;
}

export class RemoveReactionQueryDto {
  @IsString()
  @Length(1, 32)
  emoji!: string;
}
