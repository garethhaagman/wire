import type { AuditEvent } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface AuditRow {
  action: string;
  actor_id: string;
  agent_run_id: string | null;
  created_at: Date;
  id: string;
  ip: string | null;
  request_id: string | null;
  resource: string;
  resource_id: string | null;
  workspace_id: string;
}

function toAuditEvent(row: AuditRow): AuditEvent {
  return {
    id: row.id as AuditEvent["id"],
    workspaceId: row.workspace_id,
    actorId: row.actor_id,
    ip: row.ip,
    resource: row.resource,
    resourceId: row.resource_id,
    action: row.action,
    agentRunId: row.agent_run_id,
    requestId: row.request_id,
    createdAt: isoRequired(row.created_at),
  };
}

export interface NewAuditEvent {
  action: string;
  actorId: string;
  createdAt: Date;
  ip: string | null;
  requestId: string | null;
  resource: string;
  resourceId: string | null;
  workspaceId: string;
}

/** One multi-row insert per flush instead of one round trip per request. */
export async function insertAuditEvents(
  db: Queryable,
  events: NewAuditEvent[]
): Promise<void> {
  if (events.length === 0) {
    return;
  }
  await db.query(
    `insert into audit_events (id, workspace_id, actor_id, ip, resource, resource_id, action, request_id, created_at)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::timestamptz[])`,
    [
      events.map(() => newId("aud")),
      events.map((e) => e.workspaceId),
      events.map((e) => e.actorId),
      events.map((e) => e.ip),
      events.map((e) => e.resource),
      events.map((e) => e.resourceId),
      events.map((e) => e.action),
      events.map((e) => e.requestId),
      events.map((e) => e.createdAt.toISOString()),
    ]
  );
}

export async function listAuditEvents(
  db: Queryable,
  workspaceId: string,
  page: number,
  perPage: number
): Promise<{ items: AuditEvent[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<AuditRow>(
      "select * from audit_events where workspace_id = $1 order by created_at desc, id desc limit $2 offset $3",
      [workspaceId, perPage, (page - 1) * perPage]
    ),
    db.query<{ total: number }>(
      "select count(*)::int as total from audit_events where workspace_id = $1",
      [workspaceId]
    ),
  ]);
  return {
    items: rows.rows.map(toAuditEvent),
    total: count.rows[0]?.total ?? 0,
  };
}
