import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Pin } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";
import { ResourceConflictException } from "../common/errors/api-exception.js";

/**
 * Dummy/mock service — in-memory only, no persistence. Real implementation per
 * internal-docs/product/04-implementation-roadmap.md Phase 1.
 */
@Injectable()
export class PinsService {
  private readonly store = new InMemoryStore<Pin>();

  list(channelId: string): Pin[] {
    return this.store.findAll((p) => p.channelId === channelId);
  }

  add(channelId: string, messageId: string, pinnedBy: string): Pin {
    const existing = this.store.findOne((p) => p.channelId === channelId && p.messageId === messageId);
    if (existing) {
      throw new ResourceConflictException(`Message ${messageId} is already pinned in channel ${channelId}`);
    }

    return this.store.insert({
      id: `pin_${randomBytes(12).toString("hex")}`,
      channelId,
      messageId,
      pinnedBy,
      createdAt: new Date().toISOString(),
    });
  }

  remove(channelId: string, pinId: string): void {
    const removed = this.store.remove((p) => p.channelId === channelId && p.id === pinId);
    if (!removed) {
      throw new NotFoundException(`No pin with id ${pinId} in channel ${channelId}`);
    }
  }
}
