import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsEmail, IsIn, IsOptional, IsString, Length } from "class-validator";
import type {
  CreateMemberRequest,
  Member,
  MemberPreferences,
  UpdateMemberPreferencesRequest,
  UpdateMemberRequest,
} from "@wire/types";

const ROLES = ["owner", "admin", "member", "guest"] as const;

// Swagger-only schema shadow of the @wire/types interface — see
// apps/api/src/health/dto/health-response.dto.ts for why this exists alongside
// (not instead of) the canonical type.
export class MemberDto implements Member {
  @ApiProperty({ example: "mem_01jd5x0k8f3v8q2m7n4r6t9w1y" })
  id!: Member["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty({ nullable: true, type: String, description: "Null until the invite is claimed" })
  userId!: string | null;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ROLES })
  role!: Member["role"];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateMemberRequestDto implements CreateMemberRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  displayName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ROLES })
  @IsIn(ROLES)
  role!: Member["role"];
}

export class UpdateMemberRequestDto implements UpdateMemberRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;

  @ApiPropertyOptional({ enum: ROLES, description: "Admin-only" })
  @IsOptional()
  @IsIn(ROLES)
  role?: Member["role"];
}

export class MemberPreferencesDto implements MemberPreferences {
  @ApiProperty({ type: [String] })
  starredChannelIds!: string[];

  @ApiProperty({ type: [String] })
  mutedChannelIds!: string[];
}

export class UpdateMemberPreferencesRequestDto implements UpdateMemberPreferencesRequest {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  starredChannelIds?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  mutedChannelIds?: string[];
}
