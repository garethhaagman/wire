import { Module } from "@nestjs/common";
import { ChannelMembersController } from "./channel-members.controller.js";
import { ChannelsController } from "./channels.controller.js";
import { ChannelsService } from "./channels.service.js";

@Module({
  controllers: [ChannelsController, ChannelMembersController],
  providers: [ChannelsService],
})
export class ChannelsModule {}
