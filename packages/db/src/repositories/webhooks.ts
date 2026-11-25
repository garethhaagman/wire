import type { WebhookEndpoint, WireEvent } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface EndpointRow {
  channel_filter: string[] | null;
  created_at: Date;
  enabled_events: string[];
  id: string;
  secret_ciphertext: string;
  updated_at: Date;
  url: string;
  workspace_id: string;
}

function toEndpoint(row: EndpointRow): WebhookEndpoint {
  return {
    id: row.id as WebhookEndpoint["id"],
    workspaceId: row.workspace_id,
    url: row.url,
    enabledEvents: row.enabled_events,
    channelFilter: row.channel_filter,
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
  };
}

export async function listWebhookEndpoints(
  db: Queryable,
  workspaceId: string,
  page: number,
  perPage: number
): Promise<{ items: WebhookEndpoint[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<EndpointRow>(
      "select * from webhook_endpoints where workspace_id = $1 order by created_at desc, id limit $2 offset $3",
      [workspaceId, perPage, (page - 1) * perPage]
    ),
    db.query<{ total: number }>(
      "select count(*)::int as total from webhook_endpoints where workspace_id = $1",
      [workspaceId]
    ),
  ]);
  return { items: rows.rows.map(toEndpoint), total: count.rows[0]?.total ?? 0 };
}

export async function findWebhookEndpoint(
  db: Queryable,
  workspaceId: string,
  id: string
): Promise<WebhookEndpoint | null> {
  const { rows } = await db.query<EndpointRow>(
    "select * from webhook_endpoints where workspace_id = $1 and id = $2",
    [workspaceId, id]
  );
  return rows[0] ? toEndpoint(rows[0]) : null;
}

export async function insertWebhookEndpoint(
  db: Queryable,
  input: {
    workspaceId: string;
    url: string;
    enabledEvents: string[];
    channelFilter: string[] | null;
    secretCiphertext: string;
  }
): Promise<WebhookEndpoint> {
  const { rows } = await db.query<EndpointRow>(
    `insert into webhook_endpoints (id, workspace_id, url, enabled_events, channel_filter, secret_ciphertext)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [
      newId("whe"),
      input.workspaceId,
      input.url,
      input.enabledEvents,
      input.channelFilter,
      input.secretCiphertext,
    ]
  );
  return toEndpoint(rows[0]!);
}

export async function deleteWebhookEndpoint(
  db: Queryable,
  workspaceId: string,
  id: string
): Promise<boolean> {
  const { rowCount } = await db.query(
    "delete from webhook_endpoints where workspace_id = $1 and id = $2",
    [workspaceId, id]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Fans a batch of events out to every subscribed endpoint as delivery jobs, in one
 * statement. `*` in enabled_events subscribes to everything; channel_filter narrows
 * channel-scoped events. The (endpoint_id, event_id) unique constraint makes a
 * relay retry after a crash a no-op instead of a duplicate delivery.
 */
export async function enqueueWebhookDeliveries(
  tx: Queryable,
  events: WireEvent[],
  apiVersion: string
): Promise<void> {
  if (events.length === 0) {
    return;
  }
  await tx.query(
    `insert into webhook_deliveries (endpoint_id, event_id, workspace_id, payload)
     select e.id, ev.id, ev.workspace_id,
       jsonb_build_object(
         'id', ev.id, 'type', ev.type, 'created_at', ev.created_at, 'workspace_id', ev.workspace_id,
         'data', ev.data, 'api_version', $6::text)
     from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::jsonb[], $7::text[])
       as ev(id, workspace_id, type, channel_id, data, created_at)
     join webhook_endpoints e on e.workspace_id = ev.workspace_id
       and (ev.type = any(e.enabled_events) or '*' = any(e.enabled_events))
       and (e.channel_filter is null or ev.channel_id is null or ev.channel_id = any(e.channel_filter))
     on conflict (endpoint_id, event_id) do nothing`,
    [
      events.map((e) => e.id),
      events.map((e) => e.workspaceId),
      events.map((e) => e.type),
      events.map((e) => e.channelId),
      events.map((e) => JSON.stringify(e.data)),
      apiVersion,
      events.map((e) => e.createdAt),
    ]
  );
}

export interface ClaimedDelivery {
  attempts: number;
  createdAt: Date;
  endpointId: string;
  eventId: string;
  eventType: string;
  /** bigserial, kept as text end to end. */
  id: string;
  payload: unknown;
  secretCiphertext: string;
  url: string;
}

/**
 * Atomically claims due deliveries with a lease: next_attempt_at is pushed forward
 * so a worker that crashes mid-delivery doesn't strand the job — it becomes due
 * again when the lease expires. SKIP LOCKED spreads work across worker replicas.
 */
export async function claimDueDeliveries(
  db: Queryable,
  limit: number,
  leaseSeconds: number
): Promise<ClaimedDelivery[]> {
  const { rows } = await db.query<{
    id: string;
    endpoint_id: string;
    url: string;
    secret_ciphertext: string;
    event_id: string;
    payload: { type: string };
    attempts: number;
    created_at: Date;
  }>(
    `with due as (
       select id from webhook_deliveries
       where status = 'pending' and next_attempt_at <= now()
       order by next_attempt_at
       limit $1
       for update skip locked
     )
     update webhook_deliveries d
     set attempts = d.attempts + 1, next_attempt_at = now() + make_interval(secs => $2), updated_at = now()
     from due, webhook_endpoints e
     where d.id = due.id and e.id = d.endpoint_id
     returning d.id, d.endpoint_id, e.url, e.secret_ciphertext, d.event_id, d.payload, d.attempts, d.created_at`,
    [limit, leaseSeconds]
  );
  return rows.map((r) => ({
    id: r.id,
    endpointId: r.endpoint_id,
    url: r.url,
    secretCiphertext: r.secret_ciphertext,
    eventId: r.event_id,
    eventType: r.payload.type,
    payload: r.payload,
    attempts: r.attempts,
    createdAt: r.created_at,
  }));
}

export async function completeDelivery(
  db: Queryable,
  id: string,
  statusCode: number
): Promise<void> {
  await db.query(
    `update webhook_deliveries set status = 'succeeded', last_status_code = $2, last_error = null, updated_at = now()
     where id = $1`,
    [id, statusCode]
  );
}

export async function failDelivery(
  db: Queryable,
  input: {
    id: string;
    statusCode: number | null;
    error: string;
    retryInSeconds: number | null;
  }
): Promise<void> {
  await db.query(
    `update webhook_deliveries set
       status = case when $4::double precision is null then 'failed' else 'pending' end,
       next_attempt_at = case when $4::double precision is null then next_attempt_at
                              else now() + make_interval(secs => $4) end,
       last_status_code = $2, last_error = left($3, 1000), updated_at = now()
     where id = $1`,
    [input.id, input.statusCode, input.error, input.retryInSeconds]
  );
}

export async function pruneDeliveries(
  db: Queryable,
  olderThanSeconds: number,
  batchSize: number
): Promise<number> {
  const { rowCount } = await db.query(
    `delete from webhook_deliveries where id in (
       select id from webhook_deliveries
       where status <> 'pending' and updated_at < now() - make_interval(secs => $1)
       limit $2
     )`,
    [olderThanSeconds, batchSize]
  );
  return rowCount ?? 0;
}
