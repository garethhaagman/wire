import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUrl } from "class-validator";
import type { CreateWebhookEndpointRequest, WebhookEndpoint } from "@wire/types";

export class WebhookEndpointDto implements WebhookEndpoint {
  @ApiProperty({ example: "whe_64d9dea525ae84ef6f7bd361" })
  id!: WebhookEndpoint["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty({ type: [String] })
  enabledEvents!: string[];

  @ApiProperty({ nullable: true, type: [String] })
  channelFilter!: string[] | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

/** Only ever returned from create — the secret is shown once and never again. */
export class WebhookEndpointCreatedDto extends WebhookEndpointDto {
  @ApiProperty({ description: "Shown once. Store it — it cannot be retrieved again." })
  secret!: string;
}

export class CreateWebhookEndpointRequestDto implements CreateWebhookEndpointRequest {
  @ApiProperty()
  @IsUrl({ require_tld: false })
  url!: string;

  @ApiProperty({ type: [String], example: ["message.created", "agent.run.completed"] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  enabledEvents!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channelFilter?: string[];
}
