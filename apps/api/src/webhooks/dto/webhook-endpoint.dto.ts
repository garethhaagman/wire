import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  CreateWebhookEndpointRequest,
  WebhookEndpoint,
} from "@wire/types";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class WebhookEndpointDto implements WebhookEndpoint {
  @ApiProperty({ type: String, example: "whe_64d9dea525ae84ef6f7bd361" })
  id!: WebhookEndpoint["id"];

  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  workspaceId!: string;

  @ApiProperty({ example: "https://example.com/webhooks/wire" })
  url!: string;

  @ApiProperty({ type: [String] })
  enabledEvents!: string[];

  @ApiProperty({
    nullable: true,
    type: [String],
    example: ["ch_01jd5x0k8f3v8q2m7n4r6t9w1y"],
  })
  channelFilter!: string[] | null;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  updatedAt!: string;
}

/** Only ever returned from create: the secret is shown once and never again. */
export class WebhookEndpointCreatedDto extends WebhookEndpointDto {
  @ApiProperty({
    description: "Shown once. Store it: it cannot be retrieved again.",
    example: "whsec_your_secret_here",
  })
  secret!: string;
}

export class CreateWebhookEndpointRequestDto
  implements CreateWebhookEndpointRequest
{
  @ApiProperty({ example: "https://example.com/webhooks/wire" })
  @IsUrl({
    require_tld: false,
    protocols: ["http", "https"],
    require_protocol: true,
  })
  @MaxLength(2048)
  url!: string;

  @ApiProperty({
    type: [String],
    example: ["message.created", "thread.reply"],
    description: 'Event types, or "*" for all',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  enabledEvents!: string[];

  @ApiPropertyOptional({
    type: [String],
    description: "Only deliver channel events from these channels",
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  channelFilter?: string[];
}
