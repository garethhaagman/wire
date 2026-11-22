import type { WireEvent, WireEventType } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface EventRow {
  seq: string;
  id: string;
  workspace_id: string;
  type: WireEventType;
  channel_id: string | null;
  data: Record<string, unknown>;
  created_at: Date;
}

function toEvent(row: EventRow): WireEvent {
  return {
    id: row.id as WireEvent["id"],
    seq: Number(row.seq),
    type: row.type,
    workspaceId: row.workspace_id,
    channelId: row.channel_id,
    data: row.data,
    createdAt: isoRequired(row.created_at),
  };
}

export interface NewEvent {
  workspaceId: string;
  type: WireEventType;
  channelId: string | null;
  data: object;
}

/** Outbox append — call with the same transaction as the change the event describes. */
export async function appendEvents(tx: Queryable, events: NewEvent[]): Promise<void> {
  if (events.length === 0) return;
  await tx.query(
    `insert into events (id, workspace_id, type, channel_id, data)
     select * from unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::jsonb[])`,
    [
      events.map(() => newId("evt")),
      events.map((e) => e.workspaceId),
      events.map((e) => e.type),
      events.map((e) => e.channelId),
      events.map((e) => JSON.stringify(e.data)),
    ],
  );
}

/**
 * Claims a batch of unpublished events for this relay. SKIP LOCKED lets any number
 * of API/worker replicas relay concurrently without double-claiming; the row locks
 * are held until the caller's transaction marks them published.
 */
export async function claimUnpublishedEvents(tx: Queryable, limit: number): Promise<WireEvent[]> {
  const { rows } = await tx.query<EventRow>(
    `select seq, id, workspace_id, type, channel_id, data, created_at from events
     where published_at is null
     order by seq
     limit $1
     for update skip locked`,
    [limit],
  );
  return rows.map(toEvent);
}

export async function markEventsPublished(tx: Queryable, seqs: number[]): Promise<void> {
  if (seqs.length === 0) return;
  await tx.query(`update events set published_at = now() where seq = any($1::bigint[])`, [seqs]);
}

/**
 * Replay for SSE resume / GET .../events — ascending by workspace-wide seq, with the
 * channel ACL applied in SQL: workspace-level events, channels the viewer belongs
 * to, and (for non-guests) public channels.
 */
export async function listEventsAfter(
  db: Queryable,
  input: { workspaceId: string; afterSeq: number; limit: number; viewerMemberId: string; viewerIsGuest: boolean },
): Promise<{ items: WireEvent[]; hasMore: boolean }> {
  const { rows } = await db.query<EventRow>(
    `select e.seq, e.id, e.workspace_id, e.type, e.channel_id, e.data, e.created_at from events e
     where e.workspace_id = $1 and e.seq > $2 and e.published_at is not null
       and (
         e.channel_id is null
         or exists (select 1 from channel_members cm where cm.channel_id = e.channel_id and cm.member_id = $4)
         or (not $5::boolean and exists (select 1 from channels c where c.id = e.channel_id and c.type = 'public'))
       )
     order by e.seq
     limit $3`,
    [input.workspaceId, input.afterSeq, input.limit + 1, input.viewerMemberId, input.viewerIsGuest],
  );
  return { items: rows.slice(0, input.limit).map(toEvent), hasMore: rows.length > input.limit };
}

/** Batched retention delete so pruning never holds a long lock on the outbox. */
export async function pruneEvents(db: Queryable, olderThanSeconds: number, batchSize: number): Promise<number> {
  const { rowCount } = await db.query(
    `delete from events where seq in (
       select seq from events
       where published_at is not null and created_at < now() - make_interval(secs => $1)
       limit $2
     )`,
    [olderThanSeconds, batchSize],
  );
  return rowCount ?? 0;
}
