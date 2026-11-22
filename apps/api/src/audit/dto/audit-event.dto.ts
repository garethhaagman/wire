import { ApiProperty } from "@nestjs/swagger";
import type { AuditEvent } from "@wire/types";

export class AuditEventDto implements AuditEvent {
  @ApiProperty({ example: "aud_64d9dea525ae84ef6f7bd361" })
  id!: AuditEvent["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  actorId!: string;

  @ApiProperty({ nullable: true, type: String })
  ip!: string | null;

  @ApiProperty({ example: "Message" })
  resource!: string;

  @ApiProperty({ nullable: true, type: String })
  resourceId!: string | null;

  @ApiProperty({ example: "create:create" })
  action!: string;

  @ApiProperty({ nullable: true, type: String })
  agentRunId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  requestId!: string | null;

  @ApiProperty()
  createdAt!: string;
}
