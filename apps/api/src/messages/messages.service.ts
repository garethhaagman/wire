import {
  ForbiddenException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  addChannelMembers,
  appendEvents,
  Database,
  editMessage,
  findAgentByHandle,
  listChannelMessages,
  listThreadReplies,
  markThreadRead,
  softDeleteMessage,
  insertMessage,
  type NewEvent,
} from "@wire/db";
import type { ApiCursorPagination, Message } from "@wire/types";
import { AgentRunnerService } from "../agents/agent-runner.service.js";
import { ChannelAccessService } from "../channels/channel-access.service.js";
import { encodeCursor, type CursorDirection } from "../common/dto/cursor-paginated-result.js";
import { ApiException, ResourceConflictException } from "../common/errors/api-exception.js";
import { OutboxRelayService } from "../events/outbox-relay.service.js";
import { isAdmin, type WorkspaceActor } from "../permissions/actor.js";

/** Matches the handle charset enforced on creation — apps/api/src/agents/dto/agent.dto.ts's @Matches. */
const MENTION_PATTERN = /@([a-z0-9-]+)/g;

interface PostMessageInput {
  channelId: string;
  body: string;
  threadRootId?: string | undefined;
  broadcast?: boolean | undefined;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @Inject(Database) private readonly db: Database,
    private readonly access: ChannelAccessService,
    private readonly relay: OutboxRelayService,
    private readonly agentRunner: AgentRunnerService,
  ) {}

  async list(
    actor: WorkspaceActor,
    channelId: string,
    bound: { direction: CursorDirection; seq: number | undefined },
    perPage: number,
  ): Promise<{ items: Message[]; cursor: ApiCursorPagination }> {
    await this.access.readable(actor, channelId);
    const page = await listChannelMessages(this.db.primary, channelId, {
      beforeSeq: bound.direction === "before" ? bound.seq : undefined,
      afterSeq: bound.direction === "after" ? bound.seq : undefined,
      limit: perPage,
    });
    const last = page.items.at(-1);
    return {
      items: page.items,
      cursor: {
        per_page: perPage,
        has_more: page.hasMore,
        next_cursor: page.hasMore && last ? encodeCursor(bound.direction, last.seq) : null,
      },
    };
  }

  async getById(actor: WorkspaceActor, channelId: string, id: string): Promise<Message> {
    const { message } = await this.access.readableMessage(actor, id, { channelId });
    return message;
  }

  /**
   * Posting to a public channel you haven't joined joins you, in the same
   * transaction as the message (no window where you've posted but aren't a member).
   */
  async post(actor: WorkspaceActor, input: PostMessageInput): Promise<Message> {
    const { isMember } = await this.access.writable(actor, input.channelId);

    const message = await this.db.tx(async (tx) => {
      const events: NewEvent[] = [];
      if (!isMember) {
        const joined = await addChannelMembers(tx, input.channelId, actor.workspaceId, [
          actor.member.id,
        ]);
        if (joined.length) {
          events.push({
            workspaceId: actor.workspaceId,
            type: "channel.member.joined",
            channelId: input.channelId,
            data: { channelId: input.channelId, memberId: actor.member.id },
          });
        }
      }

      const result = await insertMessage(tx, {
        workspaceId: actor.workspaceId,
        channelId: input.channelId,
        actorId: actor.member.id,
        actorType: "human",
        body: input.body,
        threadRootId: input.threadRootId ?? null,
        broadcast: Boolean(input.threadRootId && input.broadcast),
      });
      if (!result.ok) {
        if (result.reason === "channel_unavailable") {
          throw new ApiException(
            "RESOURCE_CONFLICT",
            `Channel ${input.channelId} is archived.`,
            HttpStatus.CONFLICT,
          );
        }
        throw new NotFoundException(`No thread root message with id ${input.threadRootId}`);
      }

      events.push({
        workspaceId: actor.workspaceId,
        type: result.message.threadRootId ? "thread.reply" : "message.created",
        channelId: input.channelId,
        data: { message: result.message },
      });
      await appendEvents(tx, events);
      return result.message;
    });

    this.relay.kick();

    this.triggerMentionedAgents(actor, message).catch((err: unknown) => {
      this.logger.error(`mention parsing failed for message ${message.id}`, err);
    });

    return message;
  }

  /**
   * Fire-and-forget after the message transaction commits — never blocks posting,
   * never retried on failure (a missed trigger just means no agent reply, not a
   * data-integrity problem). Only human-authored messages are scanned, so an
   * agent's own reply can't re-trigger itself or another agent in a loop.
   */
  private async triggerMentionedAgents(actor: WorkspaceActor, message: Message): Promise<void> {
    const handles = new Set([...message.body.matchAll(MENTION_PATTERN)].map((match) => match[1]!));
    for (const handle of handles) {
      const agent = await findAgentByHandle(this.db, actor.workspaceId, handle);
      if (!agent) continue;
      await this.agentRunner.trigger({
        workspaceId: actor.workspaceId,
        agent,
        prompt: message.body,
        channelId: message.channelId,
        triggeredByMessageId: message.id,
      });
    }
  }

  /** Authors edit their own messages — admins can delete others' but never put words in their mouth. */
  async update(
    actor: WorkspaceActor,
    channelId: string,
    id: string,
    input: { body: string; revision?: number },
  ): Promise<Message> {
    const { message } = await this.access.readableMessage(actor, id, { channelId });
    if (message.actorId !== actor.member.id) {
      throw new ForbiddenException("You can only edit your own messages.");
    }
    await this.access.writable(actor, channelId);

    const updated = await this.db.tx(async (tx) => {
      const result = await editMessage(tx, {
        id,
        editorId: actor.member.id,
        body: input.body,
        expectedRevision: input.revision,
      });
      if (!result.ok) {
        if (result.reason === "revision_conflict") {
          throw new ResourceConflictException(
            `Message ${id} is at revision ${result.currentRevision}, not ${input.revision}. Refetch and retry.`,
          );
        }
        throw new NotFoundException(`No message with id ${id}`);
      }
      await appendEvents(tx, [
        {
          workspaceId: actor.workspaceId,
          type: "message.edited",
          channelId,
          data: { message: result.message },
        },
      ]);
      return result.message;
    });

    this.relay.kick();
    return updated;
  }

  async remove(actor: WorkspaceActor, channelId: string, id: string): Promise<void> {
    const { message } = await this.access.readableMessage(actor, id, { channelId });
    if (message.actorId !== actor.member.id && !isAdmin(actor)) {
      throw new ForbiddenException("You can only delete your own messages.");
    }

    const deleted = await this.db.tx(async (tx) => {
      const tombstone = await softDeleteMessage(tx, id);
      if (tombstone) {
        await appendEvents(tx, [
          {
            workspaceId: actor.workspaceId,
            type: "message.deleted",
            channelId,
            data: { messageId: id, threadRootId: tombstone.threadRootId, seq: tombstone.seq },
          },
        ]);
      }
      return tombstone;
    });
    if (!deleted) {
      throw new NotFoundException(`No message with id ${id}`);
    }
    this.relay.kick();
  }

  async listThread(
    actor: WorkspaceActor,
    threadRootId: string,
    afterSeq: number | undefined,
    perPage: number,
  ): Promise<{ items: Message[]; cursor: ApiCursorPagination }> {
    await this.threadRoot(actor, threadRootId, { includeDeleted: true });
    const page = await listThreadReplies(this.db.primary, threadRootId, {
      afterSeq,
      limit: perPage,
    });
    const last = page.items.at(-1);
    return {
      items: page.items,
      cursor: {
        per_page: perPage,
        has_more: page.hasMore,
        next_cursor: page.hasMore && last ? encodeCursor("after", last.seq) : null,
      },
    };
  }

  async reply(
    actor: WorkspaceActor,
    threadRootId: string,
    body: string,
    broadcast: boolean,
  ): Promise<Message> {
    const root = await this.threadRoot(actor, threadRootId, { includeDeleted: false });
    return this.post(actor, { channelId: root.channelId, body, threadRootId, broadcast });
  }

  async markThreadRead(
    actor: WorkspaceActor,
    threadRootId: string,
    seq: number | undefined,
  ): Promise<{ lastReadSeq: number }> {
    await this.threadRoot(actor, threadRootId, { includeDeleted: true });
    const lastReadSeq = await markThreadRead(this.db, {
      threadRootId,
      memberId: actor.member.id,
      workspaceId: actor.workspaceId,
      seq: seq ?? null,
    });
    if (lastReadSeq === null) throw new NotFoundException(`No thread with root ${threadRootId}`);
    return { lastReadSeq };
  }

  private async threadRoot(
    actor: WorkspaceActor,
    id: string,
    options: { includeDeleted: boolean },
  ): Promise<Message> {
    const { message } = await this.access.readableMessage(actor, id, options);
    if (message.threadRootId) {
      throw new NotFoundException(`Message ${id} is a reply, not a thread root`);
    }
    return message;
  }
}
