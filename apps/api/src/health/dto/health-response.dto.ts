import { ApiProperty } from "@nestjs/swagger";
import type { HealthResponse } from "@wire/types";

// Swagger reads runtime decorator metadata, which plain `interface` types from
// @wire/types don't carry — this class mirrors HealthResponse purely for schema
// generation; HealthResponse (packages/types) stays the canonical cross-package contract.
export class HealthResponseDto implements HealthResponse {
  @ApiProperty({ enum: ["ok"] })
  status!: "ok";

  @ApiProperty()
  version!: string;

  @ApiProperty()
  timestamp!: string;
}
