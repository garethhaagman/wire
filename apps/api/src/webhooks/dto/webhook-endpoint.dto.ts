import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
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
  @IsUrl({ require_tld: false, protocols: ["http", "https"], require_protocol: true })
  @MaxLength(2048)
  url!: string;

  @ApiProperty({ type: [String], example: ["message.created", "thread.reply"], description: 'Event types, or "*" for all' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  enabledEvents!: string[];

  @ApiPropertyOptional({ type: [String], description: "Only deliver channel events from these channels" })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  channelFilter?: string[];
}
