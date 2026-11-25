import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  addChannelMembers,
  appendEvents,
  Database,
  filterActiveMemberIds,
  findChannelMember,
  getChannelForViewer,
  insertChannel,
  isUniqueViolation,
  type ListChannelsOptions,
  listChannelMembers,
  listChannelsForViewer,
  markChannelRead,
  removeChannelMember,
  setChannelArchived,
  updateChannel,
} from "@wire/db";
import type {
  Channel,
  ChannelMember,
  CreateChannelRequest,
  UpdateChannelRequest,
} from "@wire/types";
import {
  ResourceConflictException,
  ValidationException,
} from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import { isAdmin, type WorkspaceActor } from "../permissions/actor.js";
import { ChannelAccessService } from "./channel-access.service.js";

const MAX_GROUP_DM_MEMBERS = 8;
const CHANNEL_NAME = /^[a-z0-9][a-z0-9_-]{0,79}$/u;

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/gu, "-");
}

@Injectable()
export class ChannelsService {
  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly access: ChannelAccessService,
    private readonly relay: OutboxRelayService
  ) {}

  list(
    actor: WorkspaceActor,
    options: Omit<ListChannelsOptions, "isGuest">
  ): Promise<{ items: Channel[]; total: number }> {
    return listChannelsForViewer(this.db, actor.workspaceId, actor.member.id, {
      ...options,
      isGuest: actor.member.role === "guest",
    });
  }

  async getById(actor: WorkspaceActor, id: string): Promise<Channel> {
    await this.access.readable(actor, id);
    return this.viewerChannel(actor, id);
  }

  /**
   * public/private: named, the creator joins. dm/group_dm: identified by member set
   * — opening an existing conversation returns it instead of creating a duplicate.
   */
  async create(
    actor: WorkspaceActor,
    input: CreateChannelRequest
  ): Promise<Channel> {
    const isConversation = input.type === "dm" || input.type === "group_dm";
    if (actor.member.role === "guest" && !isConversation) {
      throw new ForbiddenException("Guests can only open direct messages.");
    }

    const requested = [...new Set(input.memberIds ?? [])].filter(
      (id) => id !== actor.member.id
    );
    const memberIds = await filterActiveMemberIds(
      this.db,
      actor.workspaceId,
      requested
    );
    if (memberIds.length !== requested.length) {
      throw new ValidationException([
        {
          field: "memberIds",
          code: "UNKNOWN_MEMBER",
          message: "Every memberId must be an active member of this workspace.",
        },
      ]);
    }
    if (input.type === "dm" && memberIds.length > 1) {
      throw new ValidationException([
        {
          field: "memberIds",
          code: "INVALID_DM",
          message:
            "A dm has exactly one other member (or none, for a self-DM).",
        },
      ]);
    }
    if (
      input.type === "group_dm" &&
      (memberIds.length < 2 || memberIds.length > MAX_GROUP_DM_MEMBERS - 1)
    ) {
      throw new ValidationException([
        {
          field: "memberIds",
          code: "INVALID_GROUP_DM",
          message: `A group_dm has 3 to ${MAX_GROUP_DM_MEMBERS} participants including you.`,
        },
      ]);
    }

    const name = isConversation ? input.type : normalizeName(input.name ?? "");
    if (!(isConversation || CHANNEL_NAME.test(name))) {
      throw new ValidationException([
        {
          field: "name",
          code: "INVALID_NAME",
          message:
            "Channel names are lowercase letters, numbers, - and _, up to 80 characters.",
        },
      ]);
    }

    const result = await this.db
      .tx(async (tx) => {
        const created = await insertChannel(tx, {
          workspaceId: actor.workspaceId,
          name,
          type: input.type,
          topic: input.topic ?? null,
          purpose: input.purpose ?? null,
          createdBy: actor.member.id,
          memberIds,
        });
        if (created.created) {
          await appendEvents(tx, [
            {
              workspaceId: actor.workspaceId,
              type: "channel.created",
              channelId: created.id,
              data: { channelId: created.id, type: input.type, name },
            },
            ...[actor.member.id, ...memberIds].map((memberId) => ({
              workspaceId: actor.workspaceId,
              type: "channel.member.joined" as const,
              channelId: created.id,
              data: { channelId: created.id, memberId },
            })),
          ]);
        }
        return created;
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err, "UQ_channels_workspace_name")) {
          throw new ResourceConflictException(
            `A channel named #${name} already exists.`
          );
        }
        throw err;
      });

    this.relay.kick();
    return this.viewerChannel(actor, result.id);
  }

  async update(
    actor: WorkspaceActor,
    id: string,
    input: UpdateChannelRequest
  ): Promise<Channel> {
    const { channel, isMember } = await this.access.writable(actor, id);
    if (!(isMember || isAdmin(actor))) {
      throw new ForbiddenException("Join the channel to change its details.");
    }
    if (
      (channel.type === "dm" || channel.type === "group_dm") &&
      input.name !== undefined
    ) {
      throw new ValidationException([
        {
          field: "name",
          code: "IMMUTABLE",
          message: "Direct messages can't be renamed.",
        },
      ]);
    }
    const name =
      input.name === undefined ? undefined : normalizeName(input.name);
    if (name !== undefined && !CHANNEL_NAME.test(name)) {
      throw new ValidationException([
        {
          field: "name",
          code: "INVALID_NAME",
          message:
            "Channel names are lowercase letters, numbers, - and _, up to 80 characters.",
        },
      ]);
    }

    await this.db
      .tx(async (tx) => {
        await updateChannel(tx, id, {
          name,
          topic: input.topic,
          purpose: input.purpose,
        });
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "channel.updated",
            channelId: id,
            data: { channelId: id, ...input, ...(name ? { name } : {}) },
          },
        ]);
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err, "UQ_channels_workspace_name")) {
          throw new ResourceConflictException(
            `A channel named #${name} already exists.`
          );
        }
        throw err;
      });

    this.relay.kick();
    return this.viewerChannel(actor, id);
  }

  async setArchived(
    actor: WorkspaceActor,
    id: string,
    archived: boolean
  ): Promise<Channel> {
    await this.access.readable(actor, id);
    const changed = await this.db.tx(async (tx) => {
      const didChange = await setChannelArchived(tx, id, archived);
      if (didChange) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: archived ? "channel.archived" : "channel.unarchived",
            channelId: id,
            data: { channelId: id },
          },
        ]);
      }
      return didChange;
    });
    if (!changed) {
      throw new ResourceConflictException(
        `Channel ${id} is already ${archived ? "archived" : "active"}.`
      );
    }
    this.relay.kick();
    return this.viewerChannel(actor, id);
  }

  async listMembers(
    actor: WorkspaceActor,
    id: string,
    page: number,
    perPage: number
  ): Promise<{ items: ChannelMember[]; total: number }> {
    await this.access.readable(actor, id);
    return listChannelMembers(this.db, id, page, perPage);
  }

  /**
   * Joining yourself works for any public channel you can see; adding someone else
   * requires being in the channel already. dm membership is fixed.
   */
  async addMember(
    actor: WorkspaceActor,
    channelId: string,
    memberId: string
  ): Promise<ChannelMember> {
    const { channel, isMember } = await this.access.writable(actor, channelId);
    if (channel.type === "dm" || channel.type === "group_dm") {
      throw new ResourceConflictException(
        "Direct message membership is fixed — open a new conversation instead."
      );
    }
    const self = memberId === actor.member.id;
    if (!(self || isMember)) {
      throw new ForbiddenException(
        "Join the channel before adding others to it."
      );
    }
    if (!self) {
      const [active] = await filterActiveMemberIds(this.db, actor.workspaceId, [
        memberId,
      ]);
      if (!active) {
        throw new NotFoundException(`No member with id ${memberId}`);
      }
    }

    await this.db.tx(async (tx) => {
      const added = await addChannelMembers(tx, channelId, actor.workspaceId, [
        memberId,
      ]);
      if (added.length) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "channel.member.joined",
            channelId,
            data: { channelId, memberId, addedBy: actor.member.id },
          },
        ]);
      }
    });
    this.relay.kick();

    const membership = await findChannelMember(this.db, channelId, memberId);
    if (!membership) {
      throw new NotFoundException(
        `Member ${memberId} is not in channel ${channelId}`
      );
    }
    return membership;
  }

  /** Leave (yourself) or remove (admin). Leaving a 1:1 dm isn't possible. */
  async removeMember(
    actor: WorkspaceActor,
    channelId: string,
    memberId: string
  ): Promise<void> {
    const { channel } = await this.access.readable(actor, channelId);
    const self = memberId === actor.member.id;
    if (!(self || isAdmin(actor))) {
      throw new ForbiddenException(
        "Only admins can remove other members from a channel."
      );
    }
    if (channel.type === "dm") {
      throw new ResourceConflictException("You can't leave a direct message.");
    }

    const removed = await this.db.tx(async (tx) => {
      const didRemove = await removeChannelMember(tx, channelId, memberId);
      if (didRemove) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "channel.member.left",
            channelId,
            data: { channelId, memberId, removedBy: actor.member.id },
          },
        ]);
      }
      return didRemove;
    });
    if (!removed) {
      throw new NotFoundException(
        `Member ${memberId} is not in channel ${channelId}`
      );
    }
    this.relay.kick();
  }

  async markRead(
    actor: WorkspaceActor,
    channelId: string,
    seq: number | undefined
  ): Promise<ChannelMember> {
    await this.access.readable(actor, channelId);
    const membership = await markChannelRead(
      this.db,
      channelId,
      actor.member.id,
      seq ?? null
    );
    if (!membership) {
      throw new NotFoundException(
        `You are not a member of channel ${channelId}`
      );
    }
    return membership;
  }

  private async viewerChannel(
    actor: WorkspaceActor,
    id: string
  ): Promise<Channel> {
    const channel = await getChannelForViewer(this.db, id, actor.member.id);
    if (!channel) {
      throw new NotFoundException(`No channel with id ${id}`);
    }
    return channel;
  }
}
