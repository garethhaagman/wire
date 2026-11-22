import type { Logger } from "@nestjs/common";

const REPEAT_INTERVAL_MS = 60_000;
const UNDEFINED_TABLE = "42P01";

/**
 * For polling loops: logs an error the first time it occurs and then at most once
 * a minute while it keeps recurring, instead of on every tick.
 */
export class RepeatErrorLogger {
  private last: { message: string; at: number } | null = null;

  constructor(
    private readonly logger: Logger,
    private readonly context: string,
  ) {}

  error(err: unknown): void {
    const message = describe(err);
    const now = Date.now();
    if (this.last?.message === message && now - this.last.at < REPEAT_INTERVAL_MS) return;
    this.last = { message, at: now };
    this.logger.error(`${this.context}: ${message}`);
  }

  /** Call after a successful tick so the next failure is logged immediately. */
  reset(): void {
    this.last = null;
  }
}

function describe(err: unknown): string {
  const e = err as { message?: string; code?: string };
  const message = e.message || e.code || String(err);
  return e.code === UNDEFINED_TABLE ? `${message} — run \`make migrate\`` : message;
}
