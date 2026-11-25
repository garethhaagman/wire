import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";

/** Anything that can run a parameterized query — a Pool, or a PoolClient inside a transaction. */
export interface Queryable {
  query: <R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResult<R>>;
}

export interface DatabaseOptions {
  poolMax?: number | undefined;
  /** Optional streaming replica for read-heavy queries (history, search, lists). */
  readUrl?: string | undefined;
  statementTimeoutMs?: number | undefined;
  url: string;
}

/** Postgres SQLSTATEs that are safe to retry the whole transaction on. */
const RETRYABLE_SQLSTATES = new Set(["40001", "40P01"]);
const MAX_TX_ATTEMPTS = 3;

function isRetryable(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    RETRYABLE_SQLSTATES.has((err as { code?: string }).code ?? "")
  );
}

/**
 * The one Postgres entry point for apps/api. A single primary pool is shared by the
 * app and Better Auth so connection count per process stays predictable (put
 * PgBouncer in transaction mode in front when running many API replicas). Reads
 * that tolerate replica lag go through `read()`.
 */
export class Database {
  readonly primary: Pool;
  private readonly replica: Pool | null;

  constructor(options: DatabaseOptions) {
    const common = {
      max: options.poolMax ?? 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5000,
      ...(options.statementTimeoutMs
        ? { statement_timeout: options.statementTimeoutMs }
        : {}),
    };
    this.primary = new Pool({ connectionString: options.url, ...common });
    this.replica = options.readUrl
      ? new Pool({ connectionString: options.readUrl, ...common })
      : null;
  }

  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> {
    return this.primary.query<R>(text, values);
  }

  /** Replica-backed read; falls back to the primary when no replica is configured. */
  read<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>> {
    return this.reader.query<R>(text, values);
  }

  /** The replica (or primary) as a Queryable, for repository calls that tolerate replica lag. */
  get reader(): Queryable {
    return this.replica ?? this.primary;
  }

  /**
   * Runs `fn` in a READ COMMITTED transaction, retrying on serialization failures
   * and deadlocks. `fn` must be safe to re-run — keep side effects outside it.
   */
  async tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    // biome-ignore lint/style/noIncrementDecrement: plain retry counter
    for (let attempt = 1; ; attempt++) {
      // biome-ignore lint/performance/noAwaitInLoops: each retry attempt depends on the previous one failing with a retryable error
      const client = await this.primary.connect();
      try {
        await client.query("begin");
        const result = await fn(client);
        await client.query("commit");
        return result;
      } catch (err) {
        await client.query("rollback").catch(() => undefined);
        if (attempt < MAX_TX_ATTEMPTS && isRetryable(err)) {
          continue;
        }
        throw err;
      } finally {
        client.release();
      }
    }
  }

  async close(): Promise<void> {
    await this.primary.end();
    await this.replica?.end();
  }
}

/** Postgres unique_violation, optionally for a specific constraint/index name. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const pgErr = err as { code?: string; constraint?: string };
  return (
    pgErr.code === "23505" && (!constraint || pgErr.constraint === constraint)
  );
}

export function iso(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function isoRequired(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}
