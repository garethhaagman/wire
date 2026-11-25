import { createHmac } from "node:crypto";
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type { ApiEnv } from "@wire/config";
import {
  claimDueDeliveries,
  completeDelivery,
  Database,
  failDelivery,
  pruneDeliveries,
  type ClaimedDelivery,
} from "@wire/db";
import { RepeatErrorLogger } from "../common/logging/repeat-error-logger.js";
import { API_ENV } from "../config/env.provider.js";
import { assertPublicHost, WebhookDeliveryError } from "./url-safety.js";
import { WebhookSecretBox } from "./webhook-secret-box.js";

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;
/** Longer than REQUEST_TIMEOUT_MS so a slow attempt can't be claimed twice. */
const LEASE_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 20;
const GIVE_UP_AFTER_MS = 72 * 60 * 60 * 1000;
const MAX_BACKOFF_SECONDS = 6 * 60 * 60;
const PRUNE_INTERVAL_MS = 10 * 60_000;
const DELIVERY_RETENTION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Delivers webhook jobs enqueued by the outbox relay. Each request is signed
 * `Wire-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>">`; receivers
 * should reject stale timestamps and dedupe on `Wire-Event-Id` (delivery is
 * at-least-once). Non-2xx and network errors retry with jittered exponential
 * backoff for up to 72h. Every replica may run this — claims use SKIP LOCKED.
 */
@Injectable()
export class WebhookDeliveryWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);
  private readonly errors = new RepeatErrorLogger(this.logger, "webhook delivery tick failed");
  private readonly enabled: boolean;
  private readonly checkSsrf: boolean;
  private running = false;
  private stopped = false;
  private timers: NodeJS.Timeout[] = [];

  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(API_ENV) env: ApiEnv,
    private readonly secrets: WebhookSecretBox,
  ) {
    this.enabled = env.RUN_WORKERS;
    this.checkSsrf = env.NODE_ENV === "production";
  }

  onApplicationBootstrap(): void {
    if (!this.enabled) return;
    this.timers.push(setInterval(() => void this.tick(), POLL_INTERVAL_MS));
    this.timers.push(setInterval(() => void this.prune(), PRUNE_INTERVAL_MS));
  }

  onApplicationShutdown(): void {
    this.stopped = true;
    for (const timer of this.timers) clearInterval(timer);
  }

  private async tick(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      let claimed: ClaimedDelivery[];
      do {
        claimed = await claimDueDeliveries(this.db, BATCH_SIZE, LEASE_SECONDS);
        await Promise.all(claimed.map((delivery) => this.deliver(delivery)));
      } while (claimed.length === BATCH_SIZE && !this.stopped);
      this.errors.reset();
    } catch (err) {
      this.errors.error(err);
    } finally {
      this.running = false;
    }
  }

  private async deliver(delivery: ClaimedDelivery): Promise<void> {
    let statusCode: number | null = null;
    try {
      const url = new URL(delivery.url);
      if (this.checkSsrf) await assertPublicHost(url.hostname);

      const body = JSON.stringify(delivery.payload);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHmac("sha256", this.secrets.open(delivery.secretCiphertext))
        .update(`${timestamp}.${body}`)
        .digest("hex");

      const res = await fetch(url, {
        method: "POST",
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Wire-Webhooks/1",
          "Wire-Event-Id": delivery.eventId,
          "Wire-Event-Type": delivery.eventType,
          "Wire-Delivery-Attempt": String(delivery.attempts),
          "Wire-Signature": `t=${timestamp},v1=${signature}`,
        },
      });
      statusCode = res.status;
      await res.body?.cancel();
      if (res.ok) {
        await completeDelivery(this.db, delivery.id, res.status);
        return;
      }
      throw new WebhookDeliveryError(`endpoint responded ${res.status}`);
    } catch (err) {
      await failDelivery(this.db, {
        id: delivery.id,
        statusCode,
        error: (err as Error).message,
        retryInSeconds: this.retryDelay(delivery),
      }).catch((dbErr: unknown) =>
        this.logger.error(`recording webhook failure: ${(dbErr as Error).message}`),
      );
    }
  }

  /** null = give up. Full jitter over 10s * 2^attempt, capped at 6h. */
  private retryDelay(delivery: ClaimedDelivery): number | null {
    if (
      delivery.attempts >= MAX_ATTEMPTS ||
      Date.now() - delivery.createdAt.getTime() > GIVE_UP_AFTER_MS
    ) {
      return null;
    }
    const ceiling = Math.min(MAX_BACKOFF_SECONDS, 10 * 2 ** delivery.attempts);
    return Math.max(1, Math.round(ceiling / 2 + Math.random() * (ceiling / 2)));
  }

  private async prune(): Promise<void> {
    try {
      while (
        !this.stopped &&
        (await pruneDeliveries(this.db, DELIVERY_RETENTION_SECONDS, 5000)) > 0
      ) {
        // keep deleting in bounded batches
      }
    } catch (err) {
      this.logger.warn(`webhook delivery prune failed: ${(err as Error).message}`);
    }
  }
}
