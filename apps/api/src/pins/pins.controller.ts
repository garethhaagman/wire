import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Pin } from "@wire/types";
import type { AuthedRequest } from "../auth/session.guard.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { PinsService } from "./pins.service.js";
import { CreatePinRequestDto, PinDto } from "./dto/pin.dto.js";

@ApiTags("Pins")
@ApiCookieAuth()
@Controller("v1/channels/:channelId/pins")
export class PinsController {
  constructor(private readonly pins: PinsService) {}

  @Get()
  @RequirePermission("read", "Pin")
  @ApiOkResponse({ type: PinDto, isArray: true })
  list(@Param("channelId") channelId: string): Pin[] {
    return this.pins.list(channelId);
  }

  @Post()
  @RequirePermission("create", "Pin")
  @ApiCreatedResponse({ type: PinDto })
  add(
    @Req() req: AuthedRequest,
    @Param("channelId") channelId: string,
    @Body() body: CreatePinRequestDto,
  ): Pin {
    const pinnedBy = req.session!.user.id;
    return this.pins.add(channelId, body.messageId, pinnedBy);
  }

  @Delete(":id")
  @RequirePermission("delete", "Pin")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  remove(@Param("channelId") channelId: string, @Param("id") id: string): null {
    this.pins.remove(channelId, id);
    return null;
  }
}
