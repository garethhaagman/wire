import { ApiProperty } from "@nestjs/swagger";
import type { AuditEvent } from "@wire/types";

export class AuditEventDto implements AuditEvent {
  @ApiProperty({ example: "aud_64d9dea525ae84ef6f7bd361" })
  id!: AuditEvent["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "mem_64d9dea525ae84ef6f7bd361" })
  actorId!: string;

  @ApiProperty({ nullable: true, type: String, example: "203.0.113.42" })
  ip!: string | null;

  @ApiProperty({ example: "Message" })
  resource!: string;

  @ApiProperty({ nullable: true, type: String, example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  resourceId!: string | null;

  @ApiProperty({ example: "create:create" })
  action!: string;

  @ApiProperty({ nullable: true, type: String, example: "run_64d9dea525ae84ef6f7bd361" })
  agentRunId!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "req_64d9dea525ae84ef6f7bd361" })
  requestId!: string | null;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;
}
