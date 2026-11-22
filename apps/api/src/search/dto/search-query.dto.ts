import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class SearchQueryDto {
  @ApiProperty({ description: 'Keyword query. Supports "quoted phrases", OR, and -exclusions.' })
  @IsString()
  @Length(1, 500)
  q!: string;

  @ApiPropertyOptional({ description: "Limit to one workspace (default: every workspace you belong to)" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  workspace_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 64)
  channel_id?: string;

  @ApiPropertyOptional({ description: "Limit to one thread (root and replies)" })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  thread_root_id?: string;

  @ApiProperty({ required: false, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  page?: number = 1;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 20;
}
