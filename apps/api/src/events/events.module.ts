import { Global, Module } from "@nestjs/common";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { EventsController } from "./events.controller.js";
import { OutboxRelayService } from "./outbox-relay.service.js";
import { PresenceService } from "./presence.service.js";
import { RealtimeService } from "./realtime.service.js";
import { RealtimeWsGateway } from "./realtime-ws.gateway.js";

/** Global so every mutating service can kick the relay after its transaction commits. */
@Global()
@Module({
  controllers: [EventsController],
  providers: [
    OutboxRelayService,
    RealtimeService,
    PresenceService,
    ChannelAccessService,
    RealtimeWsGateway,
  ],
  exports: [OutboxRelayService, RealtimeService, ChannelAccessService],
})
export class EventsModule {}
