import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { HealthResponse } from "@wire/types";
import { Public } from "../auth/public.decorator.js";
import { HealthResponseDto } from "./dto/health-response.dto.js";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @ApiOkResponse({ type: HealthResponseDto })
  get(): HealthResponse {
    return {
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
    };
  }
}
