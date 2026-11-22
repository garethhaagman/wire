import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { CreateWebhookEndpointRequest, WebhookEndpoint } from "@wire/types";
import { InMemoryStore } from "../common/mock/in-memory-store.js";

interface WebhookEndpointRecord extends WebhookEndpoint {
  secret: string;
}

function toPublic(record: WebhookEndpointRecord): WebhookEndpoint {
  const { secret: _secret, ...rest } = record;
  return rest;
}

/**
 * Dummy/mock service — in-memory only, no persistence, no actual delivery.
 * Real implementation (signing, retries, delivery worker) per
 * internal-docs/api/events-webhooks.md and internal-docs/product/04-implementation-roadmap.md Phase 4.
 */
@Injectable()
export class WebhooksService {
  private readonly store = new InMemoryStore<WebhookEndpointRecord>();

  list(workspaceId: string, page: number, perPage: number): { items: WebhookEndpoint[]; total: number } {
    const all = this.store.findAll((w) => w.workspaceId === workspaceId);
    const start = (page - 1) * perPage;
    return { items: all.slice(start, start + perPage).map(toPublic), total: all.length };
  }

  getById(workspaceId: string, id: string): WebhookEndpoint {
    const record = this.store.findOne((w) => w.workspaceId === workspaceId && w.id === id);
    if (!record) {
      throw new NotFoundException(`No webhook endpoint with id ${id}`);
    }
    return toPublic(record);
  }

  /** Returns the record including `secret` — the one time it's ever visible. */
  create(workspaceId: string, input: CreateWebhookEndpointRequest): WebhookEndpointRecord {
    const now = new Date().toISOString();
    return this.store.insert({
      id: `whe_${randomBytes(12).toString("hex")}`,
      workspaceId,
      url: input.url,
      enabledEvents: input.enabledEvents,
      channelFilter: input.channelFilter ?? null,
      secret: `whsec_${randomBytes(24).toString("hex")}`,
      createdAt: now,
      updatedAt: now,
    });
  }

  remove(workspaceId: string, id: string): void {
    const removed = this.store.remove((w) => w.workspaceId === workspaceId && w.id === id);
    if (!removed) {
      throw new NotFoundException(`No webhook endpoint with id ${id}`);
    }
  }
}
