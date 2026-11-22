import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsIn, IsString, Length } from "class-validator";
import type { CreateMemberRequest, Member } from "@wire/types";

// Swagger-only schema shadow of the @wire/types interface — see
// apps/api/src/health/dto/health-response.dto.ts for why this exists alongside
// (not instead of) the canonical type.
export class MemberDto implements Member {
  @ApiProperty({ example: "mem_64d9dea525ae84ef6f7bd361" })
  id!: Member["id"];

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ["owner", "admin", "member", "guest"] })
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

  @ApiProperty({ enum: ["owner", "admin", "member", "guest"] })
  @IsIn(["owner", "admin", "member", "guest"])
  role!: Member["role"];
}
