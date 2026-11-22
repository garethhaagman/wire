import { Inject, Injectable } from "@nestjs/common";
import { appendEvents, Database, deleteReaction, insertReaction, listReactions } from "@wire/db";
import type { Reaction } from "@wire/types";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { ResourceConflictException } from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import type { WorkspaceActor } from "../permissions/actor.js";

@Injectable()
export class ReactionsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly access: ChannelAccessService,
    private readonly relay: OutboxRelayService,
  ) {}

  async list(actor: WorkspaceActor, messageId: string): Promise<Reaction[]> {
    await this.access.readableMessage(actor, messageId);
    return listReactions(this.db, messageId);
  }

  async add(actor: WorkspaceActor, messageId: string, emoji: string): Promise<Reaction> {
    const { message } = await this.access.readableMessage(actor, messageId);
    await this.access.writable(actor, message.channelId);

    const reaction = await this.db.tx(async (tx) => {
      const inserted = await insertReaction(tx, {
        workspaceId: actor.workspaceId,
        messageId,
        actorId: actor.member.id,
        emoji,
      });
      if (inserted) {
        await appendEvents(tx, [
          { workspaceId: actor.workspaceId, type: "reaction.added", channelId: message.channelId, data: { reaction: inserted } },
        ]);
      }
      return inserted;
    });
    if (!reaction) {
      throw new ResourceConflictException(`You already reacted to message ${messageId} with ${emoji}`);
    }
    this.relay.kick();
    return reaction;
  }

  /** Idempotent: removing a reaction that isn't there succeeds without emitting an event. */
  async remove(actor: WorkspaceActor, messageId: string, emoji: string): Promise<void> {
    const { message } = await this.access.readableMessage(actor, messageId);
    const removed = await this.db.tx(async (tx) => {
      const didRemove = await deleteReaction(tx, { messageId, actorId: actor.member.id, emoji });
      if (didRemove) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "reaction.removed",
            channelId: message.channelId,
            data: { messageId, actorId: actor.member.id, emoji },
          },
        ]);
      }
      return didRemove;
    });
    if (removed) this.relay.kick();
  }
}
