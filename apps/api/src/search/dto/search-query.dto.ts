import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class SearchQueryDto {
  @ApiProperty({
    description:
      'Keyword query. Supports "quoted phrases", OR, and -exclusions.',
    example: "launch plan",
  })
  @IsString()
  @Length(1, 500)
  q!: string;

  @ApiPropertyOptional({
    description:
      "Limit to one workspace (default: every workspace you belong to)",
    example: "ws_64d9dea525ae84ef6f7bd361",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  workspace_id?: string;

  @ApiPropertyOptional({ example: "ch_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  channel_id?: string;

  @ApiPropertyOptional({
    description: "Limit to one thread (root and replies)",
    example: "msg_01jd5x0k8f3v8q2m7n4r6t9w1y",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  thread_root_id?: string;

  @ApiProperty({ required: false, minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number = 1;

  @ApiProperty({
    required: false,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 20;
}
