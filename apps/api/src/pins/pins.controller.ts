import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import type { Pin } from "@wire/types";
import { CurrentActor, type WorkspaceActor } from "../permissions/actor.js";
import { RequirePermission } from "../permissions/require-permission.decorator.js";
import { WorkspaceScope } from "../permissions/workspace-scope.decorator.js";
import { CreatePinRequestDto, PinDto } from "./dto/pin.dto.js";
import { PinsService } from "./pins.service.js";

@ApiTags("Pins")
@ApiCookieAuth()
@WorkspaceScope({ from: "channel", param: "channelId" })
@Controller("v1/channels/:channelId/pins")
export class PinsController {
  constructor(private readonly pins: PinsService) {}

  @Get()
  @ApiOperation({
    operationId: "list_pins",
    summary: "List the pinned messages in a channel",
  })
  @RequirePermission("read", "Pin")
  @ApiOkResponse({ type: PinDto, isArray: true })
  list(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string
  ): Promise<Pin[]> {
    return this.pins.list(actor, channelId);
  }

  @Post()
  @ApiOperation({
    operationId: "pin_message",
    summary: "Pin a message to its channel",
  })
  @RequirePermission("create", "Pin")
  @ApiCreatedResponse({ type: PinDto })
  add(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Body() body: CreatePinRequestDto
  ): Promise<Pin> {
    return this.pins.add(actor, channelId, body.messageId);
  }

  @Delete(":id")
  @ApiOperation({
    operationId: "unpin_message",
    summary: "Remove a pin from a channel",
  })
  @RequirePermission("delete", "Pin")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ schema: { type: "null" } })
  async remove(
    @CurrentActor() actor: WorkspaceActor,
    @Param("channelId") channelId: string,
    @Param("id") id: string
  ): Promise<null> {
    await this.pins.remove(actor, channelId, id);
    return null;
  }
}
