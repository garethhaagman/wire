import { HttpStatus, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  Database,
  findChannelRecord,
  findMessage,
  isChannelMember,
  type ChannelRecord,
} from "@wire/db";
import type { Message } from "@wire/types";
import { ApiException } from "../common/errors/api-exception.js";
import type { WorkspaceActor } from "../permissions/actor.js";

interface ChannelAccess {
  channel: ChannelRecord;
  isMember: boolean;
}

/**
 * Channel-level ACL shared by every channel-nested resource. Visibility rules:
 * public channels are readable by any non-guest member of the workspace; private,
 * dm and group_dm channels (and everything, for guests) require channel
 * membership. Invisible channels are reported as 404, never 403.
 */
@Injectable()
export class ChannelAccessService {
  constructor(@Inject(Database) private readonly db: Database) {}

  async readable(actor: WorkspaceActor, channelId: string): Promise<ChannelAccess> {
    const channel = await findChannelRecord(this.db, channelId);
    if (!channel || channel.workspaceId !== actor.workspaceId) {
      throw new NotFoundException(`No channel with id ${channelId}`);
    }
    const isMember = await isChannelMember(this.db, channelId, actor.member.id);
    const openToActor = channel.type === "public" && actor.member.role !== "guest";
    if (!isMember && !openToActor) {
      throw new NotFoundException(`No channel with id ${channelId}`);
    }
    return { channel, isMember };
  }

  /** Readable and not archived. */
  async writable(actor: WorkspaceActor, channelId: string): Promise<ChannelAccess> {
    const access = await this.readable(actor, channelId);
    if (access.channel.archivedAt) {
      throw new ApiException(
        "RESOURCE_CONFLICT",
        `Channel ${channelId} is archived.`,
        HttpStatus.CONFLICT,
      );
    }
    return access;
  }

  /** Message lookup with the ACL of the channel it lives in; tombstones count as missing. */
  async readableMessage(
    actor: WorkspaceActor,
    messageId: string,
    options: { channelId?: string; includeDeleted?: boolean } = {},
  ): Promise<{ message: Message } & ChannelAccess> {
    const message = await findMessage(this.db, messageId);
    if (
      !message ||
      message.workspaceId !== actor.workspaceId ||
      (options.channelId !== undefined && message.channelId !== options.channelId) ||
      (message.deletedAt && !options.includeDeleted)
    ) {
      throw new NotFoundException(`No message with id ${messageId}`);
    }
    const access = await this.readable(actor, message.channelId);
    return { message, ...access };
  }
}
