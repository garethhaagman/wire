import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Message } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

interface CreateMessageInput {
  channelId: string;
  actorId: string;
  body: string;
  threadRootId?: string;
}

/**
 * Dummy/mock service — in-memory only, no persistence. Real implementation per
 * internal-docs/product/04-implementation-roadmap.md Phase 1.
 */
@Injectable()
export class MessagesService {
  private readonly store = new InMemoryStore<Message>();

  list(page: number, perPage: number): { items: Message[]; total: number } {
    return this.store.list(page, perPage);
  }

  getById(id: string): Message {
    const message = this.store.findById(id);
    if (!message) {
      throw new NotFoundException(`No message with id ${id}`);
    }
    return message;
  }

  /** Read-only access for other modules (reactions, pins, search) that need to look
   * up or scan messages without duplicating the in-memory store. */
  findAll(predicate: (message: Message) => boolean): Message[] {
    return this.store.findAll(predicate);
  }

  /** All replies to a thread root, oldest first — product/02-core-concepts.md § Thread. */
  listThread(threadRootId: string, page: number, perPage: number): { items: Message[]; total: number } {
    const replies = this.store
      .findAll((m) => m.threadRootId === threadRootId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const start = (page - 1) * perPage;
    return { items: replies.slice(start, start + perPage), total: replies.length };
  }

  create(input: CreateMessageInput): Message {
    const now = new Date().toISOString();
    return this.store.insert({
      id: `msg_${randomBytes(12).toString("hex")}`,
      channelId: input.channelId,
      threadRootId: input.threadRootId ?? null,
      actorId: input.actorId,
      actorType: "human",
      body: input.body,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Reply in a thread, optionally also broadcasting a copy to the channel
   * (product/05-feature-parity.md § Threads — "Also send to channel"). The root
   * message's channelId is looked up so the reply lands in the right channel.
   */
  reply(threadRootId: string, actorId: string, body: string, broadcastToChannel: boolean): Message {
    const root = this.getById(threadRootId);
    const reply = this.create({ channelId: root.channelId, actorId, body, threadRootId });

    if (broadcastToChannel) {
      this.create({ channelId: root.channelId, actorId, body });
    }

    return reply;
  }
}
