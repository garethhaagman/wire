import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";
import type { CreateReactionRequest, Reaction } from "@wire/types";

export class ReactionDto implements Reaction {
  @ApiProperty({ example: "rxn_64d9dea525ae84ef6f7bd361" })
  id!: Reaction["id"];

  @ApiProperty()
  messageId!: string;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({ example: "👍" })
  emoji!: string;

  @ApiProperty()
  createdAt!: string;
}

export class CreateReactionRequestDto implements CreateReactionRequest {
  @ApiProperty({ example: "👍" })
  @IsString()
  @Length(1, 32)
  emoji!: string;
}
