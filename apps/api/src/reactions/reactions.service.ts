import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { Reaction } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";
import { ResourceConflictException } from "../common/errors/api-exception.js";

/**
 * Dummy/mock service — in-memory only, no persistence. Real implementation per
 * internal-docs/product/04-implementation-roadmap.md Phase 1.
 */
@Injectable()
export class ReactionsService {
  private readonly store = new InMemoryStore<Reaction>();

  list(messageId: string): Reaction[] {
    return this.store.findAll((r) => r.messageId === messageId);
  }

  add(messageId: string, actorId: string, emoji: string): Reaction {
    const existing = this.store.findOne(
      (r) => r.messageId === messageId && r.actorId === actorId && r.emoji === emoji,
    );
    if (existing) {
      throw new ResourceConflictException(
        `Actor ${actorId} already reacted to message ${messageId} with ${emoji}`,
      );
    }

    return this.store.insert({
      id: `rxn_${randomBytes(12).toString("hex")}`,
      messageId,
      actorId,
      emoji,
      createdAt: new Date().toISOString(),
    });
  }

  remove(messageId: string, actorId: string, emoji: string): boolean {
    return this.store.remove(
      (r) => r.messageId === messageId && r.actorId === actorId && r.emoji === emoji,
    );
  }
}
