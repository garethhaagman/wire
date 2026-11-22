import { Body, Controller, Param, Patch, Get, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { UiConfigResource } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { UiConfigService } from "./ui-config.service.js";
import { UiConfigResourceDto, UpdateOrgUiConfigRequestDto, UpdateUserUiConfigRequestDto } from "./dto/ui-config.dto.js";

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
  get(@Req() req: AuthedRequest, @Param("workspaceId") workspaceId: string): UiConfigResource {
    const userId = req.session!.user.id;
    return this.uiConfig.resolve(workspaceId, userId);
  }

  @Patch("org")
  @RequirePermission("manage", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  updateOrgLayer(
    @Req() req: AuthedRequest,
    @Param("workspaceId") workspaceId: string,
    @Body() body: UpdateOrgUiConfigRequestDto,
  ): UiConfigResource {
    this.uiConfig.setOrgLayer(workspaceId, body.override, body.locks);
    return this.uiConfig.resolve(workspaceId, req.session!.user.id);
  }

  @Patch("me")
  @RequirePermission("update", "UiConfig")
  @ApiOkResponse({ type: UiConfigResourceDto })
  updateUserLayer(
    @Req() req: AuthedRequest,
    @Param("workspaceId") workspaceId: string,
    @Body() body: UpdateUserUiConfigRequestDto,
  ): UiConfigResource {
    const userId = req.session!.user.id;
    this.uiConfig.setUserLayer(workspaceId, userId, body.override);
    return this.uiConfig.resolve(workspaceId, userId);
  }
}
