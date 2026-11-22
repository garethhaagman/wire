import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { Channel, CreateChannelRequest } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

/**
 * Dummy/mock service — in-memory only, no persistence. Real implementation per
 * internal-docs/product/04-implementation-roadmap.md Phase 1.
 */
@Injectable()
export class ChannelsService {
  private readonly store = new InMemoryStore<Channel>();

  list(page: number, perPage: number): { items: Channel[]; total: number } {
    return this.store.list(page, perPage);
  }

  getById(id: string): Channel {
    const channel = this.store.findById(id);
    if (!channel) {
      throw new NotFoundException(`No channel with id ${id}`);
    }
    return channel;
  }

  create(workspaceId: string, input: CreateChannelRequest): Channel {
    const now = new Date().toISOString();
    return this.store.insert({
      id: `ch_${randomBytes(12).toString("hex")}`,
      workspaceId,
      name: input.name,
      type: input.type,
      topic: input.topic ?? null,
      purpose: input.purpose ?? null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}
