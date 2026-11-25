import { Body, Controller, Patch, Get } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { UiConfigResource } from "@wire/types";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { UiConfigService } from "./ui-config.service.js";
import {
  UiConfigResourceDto,
  UpdateOrgUiConfigRequestDto,
  UpdateUserUiConfigRequestDto,
} from "./dto/ui-config.dto.js";

/**
 * Server-resolved config, per internal-docs/ui/config-schema.md "Resolution
 * happens on the server". Clients never merge base/org/user layers
 * themselves — they GET one already-resolved UiConfig and PATCH their own
 * layer; only an admin can PATCH the org layer and locks.
 */
@ApiTags("UiConfig")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/ui-config")
export class UiConfigController {
  constructor(private readonly uiConfig: UiConfigService) {}

  @Get()
  @RequirePermission("read", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  get(@CurrentActor() actor: WorkspaceActor): Promise<UiConfigResource> {
    return this.uiConfig.resolve(actor);
  }

  @Patch("org")
  @RequirePermission("manage", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  async updateOrgLayer(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: UpdateOrgUiConfigRequestDto,
  ): Promise<UiConfigResource> {
    await this.uiConfig.setOrgLayer(actor, body.override, body.locks);
    return this.uiConfig.resolve(actor);
  }

  @Patch("me")
  @RequirePermission("update", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  async updateUserLayer(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: UpdateUserUiConfigRequestDto,
  ): Promise<UiConfigResource> {
    await this.uiConfig.setUserLayer(actor, body.override);
    return this.uiConfig.resolve(actor);
  }
}
