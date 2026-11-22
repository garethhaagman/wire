import { randomBytes } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { ApiEnv } from "@wire/config";
import {
  Database,
  deleteWebhookEndpoint,
  filterWorkspaceChannelIds,
  findWebhookEndpoint,
  insertWebhookEndpoint,
  listWebhookEndpoints,
} from "@wire/db";
import { WIRE_EVENT_TYPES, type CreateWebhookEndpointRequest, type WebhookEndpoint } from "@wire/types";
import { ValidationException } from "../common/errors/api-exception.js";
import { API_ENV } from "../config/env.provider.js";
import type { WorkspaceActor } from "../permissions/actor.js";
import { WebhookSecretBox } from "./webhook-secret-box.js";

const SUBSCRIBABLE = new Set<string>([...WIRE_EVENT_TYPES, "*"]);

/**
 * Endpoint registry. Delivery (signing, retries, backoff) is WebhookDeliveryWorker;
 * jobs are enqueued by the outbox relay. See internal-docs/api/events-webhooks.md.
 */
@Injectable()
export class WebhooksService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly secrets: WebhookSecretBox,
  ) {}

  list(actor: WorkspaceActor, page: number, perPage: number): Promise<{ items: WebhookEndpoint[]; total: number }> {
    return listWebhookEndpoints(this.db, actor.workspaceId, page, perPage);
  }

  async getById(actor: WorkspaceActor, id: string): Promise<WebhookEndpoint> {
    const endpoint = await findWebhookEndpoint(this.db, actor.workspaceId, id);
    if (!endpoint) {
      throw new NotFoundException(`No webhook endpoint with id ${id}`);
    }
    return endpoint;
  }

  /** Returns the endpoint plus its signing secret — the one time the secret is ever visible. */
  async create(actor: WorkspaceActor, input: CreateWebhookEndpointRequest): Promise<WebhookEndpoint & { secret: string }> {
    await this.validate(actor, input);
    const secret = `whsec_${randomBytes(32).toString("base64url")}`;
    const endpoint = await insertWebhookEndpoint(this.db, {
      workspaceId: actor.workspaceId,
      url: input.url,
      enabledEvents: [...new Set(input.enabledEvents)],
      channelFilter: input.channelFilter?.length ? [...new Set(input.channelFilter)] : null,
      secretCiphertext: this.secrets.seal(secret),
    });
    return { ...endpoint, secret };
  }

  async remove(actor: WorkspaceActor, id: string): Promise<void> {
    if (!(await deleteWebhookEndpoint(this.db, actor.workspaceId, id))) {
      throw new NotFoundException(`No webhook endpoint with id ${id}`);
    }
  }

  private async validate(actor: WorkspaceActor, input: CreateWebhookEndpointRequest): Promise<void> {
    const details = [];
    if (this.env.NODE_ENV === "production" && new URL(input.url).protocol !== "https:") {
      details.push({ field: "url", code: "INSECURE_URL", message: "Webhook URLs must use https" });
    }
    const unknown = input.enabledEvents.filter((e) => !SUBSCRIBABLE.has(e));
    if (unknown.length) {
      details.push({ field: "enabledEvents", code: "UNKNOWN_EVENT_TYPE", message: `Unknown event types: ${unknown.join(", ")}` });
    }
    if (input.channelFilter?.length) {
      const found = new Set(await filterWorkspaceChannelIds(this.db, actor.workspaceId, input.channelFilter));
      const missing = input.channelFilter.filter((id) => !found.has(id));
      if (missing.length) {
        details.push({ field: "channelFilter", code: "UNKNOWN_CHANNEL", message: `No such channels: ${missing.join(", ")}` });
      }
    }
    if (details.length) throw new ValidationException(details);
  }
}
