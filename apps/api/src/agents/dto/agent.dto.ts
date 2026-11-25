import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Agent,
  AgentRun,
  AgentRunStep,
  CreateAgentRequest,
  CreateAgentRunRequest,
  UpdateAgentRequest,
} from "@wire/types";
import { IsIn, IsOptional, IsString, Length, Matches } from "class-validator";

const HANDLE_PATTERN = /^[a-z0-9-]+$/u;

export class AgentDto implements Agent {
  @ApiProperty({ example: "agt_64d9dea525ae84ef6f7bd361" })
  id!: Agent["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "oncall-bot" })
  handle!: string;

  @ApiProperty({ example: "harness_claude-code" })
  harnessId!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: "pset_64d9dea525ae84ef6f7bd361",
  })
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
  @Matches(HANDLE_PATTERN, {
    message: "handle must be lowercase alphanumeric with hyphens",
  })
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

export class AgentRunStepDto implements AgentRunStep {
  @ApiProperty({ example: "step_64d9dea525ae84ef6f7bd361" })
  id!: AgentRunStep["id"];

  @ApiProperty({ example: "run_64d9dea525ae84ef6f7bd361" })
  runId!: AgentRunStep["runId"];

  @ApiProperty({ example: 0 })
  seq!: number;

  @ApiProperty({ enum: ["model_call", "tool_call", "tool_result", "final"] })
  type!: AgentRunStep["type"];

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { provider: "anthropic", model: "claude-sonnet-5" },
  })
  data!: unknown;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}

export class AgentRunDto implements AgentRun {
  @ApiProperty({ example: "run_64d9dea525ae84ef6f7bd361" })
  id!: AgentRun["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "agt_64d9dea525ae84ef6f7bd361" })
  agentId!: AgentRun["agentId"];

  @ApiProperty({
    nullable: true,
    type: String,
    example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y",
  })
  triggeredByMessageId!: AgentRun["triggeredByMessageId"];

  @ApiProperty({
    nullable: true,
    type: String,
    example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y",
  })
  channelId!: string | null;

  @ApiProperty({ enum: ["queued", "running", "succeeded", "failed"] })
  status!: AgentRun["status"];

  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { prompt: "Summarize today's incidents" },
  })
  input!: AgentRun["input"];

  @ApiProperty({
    nullable: true,
    type: String,
    example: "Here's a summary of today's incidents...",
  })
  output!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: "Harness call timed out after 30s.",
  })
  error!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: "2026-01-15T09:30:00.000Z",
  })
  startedAt!: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: "2026-01-15T09:30:04.000Z",
  })
  finishedAt!: string | null;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T09:30:04.000Z" })
  updatedAt!: string;
}

export class CreateAgentRunRequestDto implements CreateAgentRunRequest {
  @ApiProperty({ example: "Summarize today's incidents" })
  @IsString()
  @Length(1, 8000)
  prompt!: string;

  @ApiPropertyOptional({
    example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y",
    description:
      "Post the agent's reply to this channel when the run succeeds.",
  })
  @IsOptional()
  @IsString()
  channelId?: string;
}

export class AgentRunWithStepsDto extends AgentRunDto {
  @ApiProperty({ type: [AgentRunStepDto] })
  steps!: AgentRunStep[];
}
