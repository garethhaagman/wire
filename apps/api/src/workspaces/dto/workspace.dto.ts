import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length, Matches } from "class-validator";
import type { CreateWorkspaceRequest, UpdateWorkspaceRequest, Workspace } from "@wire/types";

// Swagger-only schema shadow of the @wire/types interface — see health-response.dto.ts
// for why this exists alongside (not instead of) the canonical type.
export class WorkspaceDto implements Workspace {
  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  id!: Workspace["id"];

  @ApiProperty({ example: "org_8f2c1a6e9b3d4f05" })
  orgId!: string;

  @ApiProperty({ example: "Acme Corp" })
  name!: string;

  @ApiProperty({ example: "us" })
  dataRegion!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  createdAt!: string;

  @ApiProperty({ example: "2026-01-15T09:30:00.000Z" })
  updatedAt!: string;
}

export class CreateWorkspaceRequestDto implements CreateWorkspaceRequest {
  @ApiProperty({ example: "Acme Corp" })
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: "us" })
  @IsString()
  @Matches(/^[a-z]{2}$/, { message: "dataRegion must be a 2-letter region code, e.g. 'us' or 'eu'" })
  dataRegion!: string;
}

export class UpdateWorkspaceRequestDto implements UpdateWorkspaceRequest {
  @ApiPropertyOptional({ example: "Acme Corp" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}
