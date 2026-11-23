import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";
import type { Agent, CreateAgentRequest, UpdateAgentRequest } from "@wire/types";

export class AgentDto implements Agent {
  @ApiProperty({ example: "agt_64d9dea525ae84ef6f7bd361" })
  id!: Agent["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "oncall-bot" })
  handle!: string;

  @ApiProperty({ example: "harness_claude-code" })
  harnessId!: string;

  @ApiProperty({ nullable: true, type: String, example: "pset_64d9dea525ae84ef6f7bd361" })
  permissionSetId!: string | null;

  @ApiProperty({ enum: ["active", "paused", "deleted"] })
  status!: Agent["status"];

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  updatedAt!: string;
}

export class CreateAgentRequestDto implements CreateAgentRequest {
  @ApiProperty({ example: "oncall-bot" })
  @IsString()
  @Length(1, 40)
  @Matches(/^[a-z0-9-]+$/, { message: "handle must be lowercase alphanumeric with hyphens" })
  handle!: string;

  @ApiProperty({ example: "harness_claude-code" })
  @IsString()
  harnessId!: string;
}

export class UpdateAgentRequestDto implements UpdateAgentRequest {
  @ApiPropertyOptional({ example: "harness_claude-code" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  harnessId?: string;

  @ApiPropertyOptional({ enum: ["active", "paused"] })
  @IsOptional()
  @IsIn(["active", "paused"])
  status?: "active" | "paused";
}
