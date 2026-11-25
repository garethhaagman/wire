import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { Database, insertAuditEvents, listAuditEvents, type NewAuditEvent } from "@wire/db";
import type { AuditEvent } from "@wire/types";

const FLUSH_INTERVAL_MS = 500;
const FLUSH_AT = 200;
/** Back-pressure bound: if Postgres is unreachable, drop rather than grow without limit. */
const MAX_BUFFERED = 50_000;

/**
 * Audit trail for every mutating request (see AuditInterceptor). Writes are
 * buffered and flushed as one multi-row insert, so audit costs one round trip per
 * ~500ms per replica instead of one per request. The trade-off: a hard crash loses
 * at most one flush window; graceful shutdown flushes.
 */
@Injectable()
export class AuditService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(AuditService.name);
  private buffer: NewAuditEvent[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing: Promise<void> | null = null;

  constructor(@Inject(Database) private readonly db: Database) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.flushing;
    await this.flush();
  }

  list(
    workspaceId: string,
    page: number,
    perPage: number,
  ): Promise<{ items: AuditEvent[]; total: number }> {
    return listAuditEvents(this.db, workspaceId, page, perPage);
  }

  record(event: Omit<NewAuditEvent, "createdAt">): void {
    if (this.buffer.length >= MAX_BUFFERED) {
      this.logger.error("audit buffer full — dropping event");
      return;
    }
    this.buffer.push({ ...event, createdAt: new Date() });
    if (this.buffer.length >= FLUSH_AT) void this.flush();
  }

  private flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return this.flushing ?? Promise.resolve();
    const batch = this.buffer;
    this.buffer = [];
    this.flushing = insertAuditEvents(this.db, batch)
      .catch((err: unknown) => {
        this.logger.error(
          `audit flush failed, requeueing ${batch.length}: ${(err as Error).message}`,
        );
        this.buffer = batch.concat(this.buffer).slice(0, MAX_BUFFERED);
      })
      .finally(() => {
        this.flushing = null;
      });
    return this.flushing;
  }
}
