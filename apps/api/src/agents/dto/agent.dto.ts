import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";
import type { Agent, CreateAgentRequest } from "@wire/types";

export class AgentDto implements Agent {
  @ApiProperty({ example: "agt_64d9dea525ae84ef6f7bd361" })
  id!: Agent["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  handle!: string;

  @ApiProperty()
  harnessId!: string;

  @ApiProperty({ nullable: true, type: String })
  permissionSetId!: string | null;

  @ApiProperty({ enum: ["active", "paused", "deleted"] })
  status!: Agent["status"];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateAgentRequestDto implements CreateAgentRequest {
  @ApiProperty({ example: "oncall-bot" })
  @IsString()
  @Length(1, 40)
  @Matches(/^[a-z0-9-]+$/, { message: "handle must be lowercase alphanumeric with hyphens" })
  handle!: string;

  @ApiProperty()
  @IsString()
  harnessId!: string;
}
