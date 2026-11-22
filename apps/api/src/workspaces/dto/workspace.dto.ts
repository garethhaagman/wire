import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length, Matches } from "class-validator";
import type { CreateWorkspaceRequest, Workspace } from "@wire/types";

// Swagger-only schema shadow of the @wire/types interface — see health-response.dto.ts
// for why this exists alongside (not instead of) the canonical type.
export class WorkspaceDto implements Workspace {
  @ApiProperty({ example: "ws_64d9dea525ae84ef6f7bd361" })
  id!: Workspace["id"];

  @ApiProperty()
  orgId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  dataRegion!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class CreateWorkspaceRequestDto implements CreateWorkspaceRequest {
  @ApiProperty()
  @IsString()
  @Length(1, 100)
  name!: string;

  @ApiProperty({ example: "us" })
  @IsString()
  @Matches(/^[a-z]{2}$/, { message: "dataRegion must be a 2-letter region code, e.g. 'us' or 'eu'" })
  dataRegion!: string;
}
