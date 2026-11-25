import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { appendEvents, Database, deletePin, insertPin, listPins } from "@wire/db";
import type { Pin } from "@wire/types";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { ResourceConflictException } from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import type { WorkspaceActor } from "../permissions/actor.js";

@Injectable()
export class PinsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly access: ChannelAccessService,
    private readonly relay: OutboxRelayService,
  ) {}

  async list(actor: WorkspaceActor, channelId: string): Promise<Pin[]> {
    await this.access.readable(actor, channelId);
    return listPins(this.db, channelId);
  }

  async add(actor: WorkspaceActor, channelId: string, messageId: string): Promise<Pin> {
    await this.access.writable(actor, channelId);
    await this.access.readableMessage(actor, messageId, { channelId });

    const pin = await this.db.tx(async (tx) => {
      const inserted = await insertPin(tx, {
        workspaceId: actor.workspaceId,
        channelId,
        messageId,
        pinnedBy: actor.member.id,
      });
      if (inserted) {
        await appendEvents(tx, [
          { workspaceId: actor.workspaceId, type: "pin.added", channelId, data: { pin: inserted } },
        ]);
      }
      return inserted;
    });
    if (!pin) {
      throw new ResourceConflictException(
        `Message ${messageId} is already pinned in channel ${channelId}`,
      );
    }
    this.relay.kick();
    return pin;
  }

  async remove(actor: WorkspaceActor, channelId: string, pinId: string): Promise<void> {
    await this.access.writable(actor, channelId);
    const removed = await this.db.tx(async (tx) => {
      const pin = await deletePin(tx, channelId, pinId);
      if (pin) {
        await appendEvents(tx, [
          { workspaceId: actor.workspaceId, type: "pin.removed", channelId, data: { pin } },
        ]);
      }
      return pin;
    });
    if (!removed) {
      throw new NotFoundException(`No pin with id ${pinId} in channel ${channelId}`);
    }
    this.relay.kick();
  }
}
