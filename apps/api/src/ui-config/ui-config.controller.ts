import { Body, Controller, Get, Patch } from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { UiConfigResource } from "@wire/types";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import {
  UiConfigResourceDto,
  UpdateOrgUiConfigRequestDto,
  UpdateUserUiConfigRequestDto,
} from "./dto/ui-config.dto.js";
import { UiConfigService } from "./ui-config.service.js";

/**
 * Server-resolved config, per internal-docs/ui/config-schema.md "Resolution
 * happens on the server". Clients never merge base/org/user layers
 * themselves: they GET one already-resolved UiConfig and PATCH their own
 * layer; only an admin can PATCH the org layer and locks.
 */
@ApiTags("UiConfig")
@ApiCookieAuth()
@Controller("v1/workspaces/:workspaceId/ui-config")
export class UiConfigController {
  constructor(private readonly uiConfig: UiConfigService) {}

  @Get()
  @ApiOperation({
    operationId: "get_ui_config",
    summary: "Get the caller's fully resolved UI configuration",
  })
  @RequirePermission("read", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  get(@CurrentActor() actor: WorkspaceActor): Promise<UiConfigResource> {
    return this.uiConfig.resolve(actor);
  }

  @Patch("org")
  @ApiOperation({
    operationId: "update_org_ui_config",
    summary:
      "Update the workspace-wide UI configuration layer and locks (admin only)",
  })
  @RequirePermission("manage", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  async updateOrgLayer(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: UpdateOrgUiConfigRequestDto
  ): Promise<UiConfigResource> {
    await this.uiConfig.setOrgLayer(actor, body.override, body.locks);
    return this.uiConfig.resolve(actor);
  }

  @Patch("me")
  @ApiOperation({
    operationId: "update_my_ui_config",
    summary: "Update the caller's personal UI configuration layer",
  })
  @RequirePermission("update", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  async updateUserLayer(
    @CurrentActor() actor: WorkspaceActor,
    @Body() body: UpdateUserUiConfigRequestDto
  ): Promise<UiConfigResource> {
    await this.uiConfig.setUserLayer(actor, body.override);
    return this.uiConfig.resolve(actor);
  }
}
