import type { Message } from "@wire/types";
import { iso, isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface MessageRow {
  id: string;
  workspace_id: string;
  channel_id: string;
  seq: string;
  thread_root_id: string | null;
  broadcast: boolean;
  actor_id: string;
  actor_type: Message["actorType"];
  body: string;
  revision: number;
  reply_count: number;
  last_reply_at: Date | null;
  last_reply_seq: string | null;
  reaction_counts: Record<string, number>;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = `id, workspace_id, channel_id, seq, thread_root_id, broadcast, actor_id, actor_type, body, revision,
  reply_count, last_reply_at, last_reply_seq, reaction_counts, edited_at, deleted_at, created_at, updated_at`;

function toMessage(row: MessageRow): Message {
  return {
    id: row.id as Message["id"],
    workspaceId: row.workspace_id,
    channelId: row.channel_id,
    seq: Number(row.seq),
    threadRootId: row.thread_root_id,
    broadcast: row.broadcast,
    actorId: row.actor_id,
    actorType: row.actor_type,
    body: row.body,
    revision: row.revision,
    replyCount: row.reply_count,
    lastReplyAt: iso(row.last_reply_at),
    reactionCounts: row.reaction_counts,
    editedAt: iso(row.edited_at),
    deletedAt: iso(row.deleted_at),
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
  };
}

export async function findMessage(db: Queryable, id: string): Promise<Message | null> {
  const { rows } = await db.query<MessageRow>(`select ${COLUMNS} from messages where id = $1`, [
    id,
  ]);
  return rows[0] ? toMessage(rows[0]) : null;
}

export type InsertMessageResult =
  | { ok: true; message: Message }
  | { ok: false; reason: "channel_unavailable" | "thread_root_unavailable" };

/**
 * The hot write path. In one transaction:
 * 1. allocate the next per-channel seq (`update ... returning` takes the channel
 *    row lock, serializing writers per channel — ordering is total within a channel
 *    and writes to different channels never contend);
 * 2. insert the message;
 * 3. for a reply, bump the root's counters and record thread participation;
 * 4. advance the author's own read cursors so their message never shows as unread.
 */
export async function insertMessage(
  tx: Queryable,
  input: {
    workspaceId: string;
    channelId: string;
    actorId: string;
    actorType: Message["actorType"];
    body: string;
    threadRootId: string | null;
    broadcast: boolean;
  },
): Promise<InsertMessageResult> {
  const seqResult = await tx.query<{ last_seq: string }>(
    `update channels set last_seq = last_seq + 1, last_message_at = now()
     where id = $1 and workspace_id = $2 and archived_at is null
     returning last_seq`,
    [input.channelId, input.workspaceId],
  );
  const seq = seqResult.rows[0]?.last_seq;
  if (seq === undefined) return { ok: false, reason: "channel_unavailable" };

  if (input.threadRootId) {
    const root = await tx.query<{ actor_id: string }>(
      `update messages set reply_count = reply_count + 1, last_reply_at = now(), last_reply_seq = $3
       where id = $1 and channel_id = $2 and thread_root_id is null and deleted_at is null
       returning actor_id`,
      [input.threadRootId, input.channelId, seq],
    );
    if (!root.rows[0]) return { ok: false, reason: "thread_root_unavailable" };

    // Only human members are thread participants; the select drops agent/system
    // actor ids so the FK to members can't fail.
    await tx.query(
      `insert into thread_participants (thread_root_id, member_id, workspace_id, last_read_seq)
       select $1, m.id, $2, case when m.id = $3 then $4::bigint else 0 end
       from members m where m.id = any(array[$3, $5]::text[])
       on conflict (thread_root_id, member_id) do update
         set last_read_seq = greatest(thread_participants.last_read_seq, excluded.last_read_seq)`,
      [input.threadRootId, input.workspaceId, input.actorId, seq, root.rows[0].actor_id],
    );
  }

  const { rows } = await tx.query<MessageRow>(
    `insert into messages (id, workspace_id, channel_id, seq, thread_root_id, broadcast, actor_id, actor_type, body)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning ${COLUMNS}`,
    [
      newId("msg"),
      input.workspaceId,
      input.channelId,
      seq,
      input.threadRootId,
      input.broadcast,
      input.actorId,
      input.actorType,
      input.body,
    ],
  );

  await tx.query(
    `update channel_members set last_read_seq = greatest(last_read_seq, $3)
     where channel_id = $1 and member_id = $2`,
    [input.channelId, input.actorId, seq],
  );

  return { ok: true, message: toMessage(rows[0]!) };
}

export interface CursorPage<T> {
  items: T[];
  hasMore: boolean;
}

/**
 * Keyset-paginated channel history over the partial index on (channel_id, seq):
 * newest-first below `beforeSeq`, or oldest-first above `afterSeq` (catch-up after
 * a reconnect). Deleted messages are hidden unless they still anchor a thread.
 */
export async function listChannelMessages(
  db: Queryable,
  channelId: string,
  options: { beforeSeq?: number | undefined; afterSeq?: number | undefined; limit: number },
): Promise<CursorPage<Message>> {
  const ascending = options.afterSeq !== undefined;
  const { rows } = await db.query<MessageRow>(
    `select ${COLUMNS} from messages
     where channel_id = $1
       and (thread_root_id is null or broadcast)
       and (deleted_at is null or reply_count > 0)
       and ($2::bigint is null or seq < $2)
       and ($3::bigint is null or seq > $3)
     order by seq ${ascending ? "asc" : "desc"}
     limit $4`,
    [channelId, options.beforeSeq ?? null, options.afterSeq ?? null, options.limit + 1],
  );
  return {
    items: rows.slice(0, options.limit).map(toMessage),
    hasMore: rows.length > options.limit,
  };
}

/** Thread replies, oldest first, keyset-paginated on seq. */
export async function listThreadReplies(
  db: Queryable,
  threadRootId: string,
  options: { afterSeq?: number | undefined; limit: number },
): Promise<CursorPage<Message>> {
  const { rows } = await db.query<MessageRow>(
    `select ${COLUMNS} from messages
     where thread_root_id = $1 and deleted_at is null and ($2::bigint is null or seq > $2)
     order by seq asc
     limit $3`,
    [threadRootId, options.afterSeq ?? null, options.limit + 1],
  );
  return {
    items: rows.slice(0, options.limit).map(toMessage),
    hasMore: rows.length > options.limit,
  };
}

export type EditMessageResult =
  | { ok: true; message: Message }
  | { ok: false; reason: "not_found" | "revision_conflict"; currentRevision?: number };

/**
 * Edits under a row lock: the previous body is preserved in message_revisions and
 * `revision` increments atomically. `expectedRevision` gives clients optimistic
 * concurrency (two devices editing the same message can't silently clobber).
 */
export async function editMessage(
  tx: Queryable,
  input: { id: string; editorId: string; body: string; expectedRevision?: number | undefined },
): Promise<EditMessageResult> {
  const current = await tx.query<{ body: string; revision: number }>(
    `select body, revision from messages where id = $1 and deleted_at is null for update`,
    [input.id],
  );
  const row = current.rows[0];
  if (!row) return { ok: false, reason: "not_found" };
  if (input.expectedRevision !== undefined && input.expectedRevision !== row.revision) {
    return { ok: false, reason: "revision_conflict", currentRevision: row.revision };
  }

  await tx.query(
    `insert into message_revisions (message_id, revision, body, edited_by) values ($1, $2, $3, $4)`,
    [input.id, row.revision, row.body, input.editorId],
  );
  const { rows } = await tx.query<MessageRow>(
    `update messages set body = $2, revision = revision + 1, edited_at = now(), updated_at = now()
     where id = $1 returning ${COLUMNS}`,
    [input.id, input.body],
  );
  return { ok: true, message: toMessage(rows[0]!) };
}

/**
 * Tombstones the message (body blanked; revisions, reactions, pins and bookmarks
 * purged) and keeps the root's reply_count honest.
 */
export async function softDeleteMessage(tx: Queryable, id: string): Promise<Message | null> {
  const { rows } = await tx.query<MessageRow>(
    `update messages set deleted_at = now(), body = '', reaction_counts = '{}', updated_at = now()
     where id = $1 and deleted_at is null returning ${COLUMNS}`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;

  await tx.query(`delete from message_revisions where message_id = $1`, [id]);
  await tx.query(`delete from reactions where message_id = $1`, [id]);
  await tx.query(`delete from pins where message_id = $1`, [id]);
  await tx.query(`delete from bookmarks where message_id = $1`, [id]);
  if (row.thread_root_id) {
    await tx.query(`update messages set reply_count = greatest(reply_count - 1, 0) where id = $1`, [
      row.thread_root_id,
    ]);
  }
  return toMessage(row);
}

/** Monotonic thread read cursor; creates the participant row on first read. */
export async function markThreadRead(
  db: Queryable,
  input: { threadRootId: string; memberId: string; workspaceId: string; seq: number | null },
): Promise<number | null> {
  const { rows } = await db.query<{ last_read_seq: string }>(
    `insert into thread_participants (thread_root_id, member_id, workspace_id, last_read_seq)
     select r.id, $2, $3, least(coalesce($4::bigint, r.last_reply_seq, 0), coalesce(r.last_reply_seq, 0))
     from messages r where r.id = $1 and r.thread_root_id is null
     on conflict (thread_root_id, member_id) do update
       set last_read_seq = greatest(thread_participants.last_read_seq, excluded.last_read_seq)
     returning last_read_seq`,
    [input.threadRootId, input.memberId, input.workspaceId, input.seq],
  );
  return rows[0] ? Number(rows[0].last_read_seq) : null;
}
