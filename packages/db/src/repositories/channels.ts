import type { Channel, ChannelMember } from "@wire/types";
import { iso, isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

/** Badge counts stop at "99+" — bounding the count keeps channel lists O(channels), not O(messages). */
const UNREAD_CAP = 100;

export interface ChannelRecord {
  id: string;
  workspaceId: string;
  type: Channel["type"];
  archivedAt: string | null;
  lastSeq: number;
}

interface ChannelRow {
  id: string;
  workspace_id: string;
  name: string;
  type: Channel["type"];
  topic: string | null;
  purpose: string | null;
  created_by: string | null;
  member_count: number;
  last_seq: string;
  last_message_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
  is_member?: boolean;
  last_read_seq?: string | null;
  unread_count?: number | null;
}

function toChannel(row: ChannelRow): Channel {
  return {
    id: row.id as Channel["id"],
    workspaceId: row.workspace_id,
    name: row.name,
    type: row.type,
    topic: row.topic,
    purpose: row.purpose,
    createdBy: row.created_by,
    memberCount: row.member_count,
    lastMessageSeq: Number(row.last_seq),
    lastMessageAt: iso(row.last_message_at),
    archivedAt: iso(row.archived_at),
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
    isMember: row.is_member ?? false,
    lastReadSeq: row.last_read_seq === null || row.last_read_seq === undefined ? null : Number(row.last_read_seq),
    unreadCount: row.unread_count ?? null,
  };
}

/** Viewer-relative columns: membership, read cursor and a capped unread count. */
const VIEWER_COLUMNS = `
  c.*,
  cm.member_id is not null as is_member,
  cm.last_read_seq,
  case when cm.member_id is null then null else (
    select count(*)::int from (
      select 1 from messages m
      where m.channel_id = c.id and m.seq > cm.last_read_seq
        and (m.thread_root_id is null or m.broadcast) and m.deleted_at is null
      limit ${UNREAD_CAP}
    ) unread
  ) end as unread_count`;

export async function findChannelRecord(db: Queryable, id: string): Promise<ChannelRecord | null> {
  const { rows } = await db.query<ChannelRow>(`select * from channels where id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    type: row.type,
    archivedAt: iso(row.archived_at),
    lastSeq: Number(row.last_seq),
  };
}

export async function getChannelForViewer(db: Queryable, id: string, memberId: string): Promise<Channel | null> {
  const { rows } = await db.query<ChannelRow>(
    `select ${VIEWER_COLUMNS} from channels c
     left join channel_members cm on cm.channel_id = c.id and cm.member_id = $2
     where c.id = $1`,
    [id, memberId],
  );
  return rows[0] ? toChannel(rows[0]) : null;
}

export interface ListChannelsOptions {
  page: number;
  perPage: number;
  /** Guests only see channels they belong to — never the public directory. */
  isGuest: boolean;
  joinedOnly: boolean;
  includeArchived: boolean;
  type?: Channel["type"] | undefined;
  search?: string | undefined;
}

/** Public directory plus every non-public channel the viewer belongs to. */
export async function listChannelsForViewer(
  db: Queryable,
  workspaceId: string,
  memberId: string,
  options: ListChannelsOptions,
): Promise<{ items: Channel[]; total: number }> {
  const search = options.search ? `%${options.search.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = `
    c.workspace_id = $1
    and (cm.member_id is not null or (c.type = 'public' and not $3::boolean and not $4::boolean))
    and ($5::boolean or c.archived_at is null)
    and ($6::text is null or c.type = $6)
    and ($7::text is null or c.name ilike $7)`;
  const params = [
    workspaceId,
    memberId,
    options.isGuest,
    options.joinedOnly,
    options.includeArchived,
    options.type ?? null,
    search,
  ];
  const from = `from channels c left join channel_members cm on cm.channel_id = c.id and cm.member_id = $2`;

  const [rows, count] = await Promise.all([
    db.query<ChannelRow>(
      `select ${VIEWER_COLUMNS} ${from} where ${where} order by c.name, c.id limit $8 offset $9`,
      [...params, options.perPage, (options.page - 1) * options.perPage],
    ),
    db.query<{ total: number }>(`select count(*)::int as total ${from} where ${where}`, params),
  ]);
  return { items: rows.rows.map(toChannel), total: count.rows[0]?.total ?? 0 };
}

/** dm/group_dm identity — the sorted member set, so "open a DM" is idempotent. */
export function dmKey(memberIds: string[]): string {
  return [...new Set(memberIds)].sort().join(",");
}

/**
 * Inserts a channel and its initial members. For dm/group_dm an existing channel
 * with the same member set is returned instead (`created: false`). A name clash on
 * public/private surfaces as a unique violation on UQ_channels_workspace_name.
 */
export async function insertChannel(
  tx: Queryable,
  input: {
    workspaceId: string;
    name: string;
    type: Channel["type"];
    topic: string | null;
    purpose: string | null;
    createdBy: string;
    memberIds: string[];
  },
): Promise<{ id: string; created: boolean }> {
  const members = [...new Set([input.createdBy, ...input.memberIds])];
  const key = input.type === "dm" || input.type === "group_dm" ? dmKey(members) : null;

  const { rows } = await tx.query<{ id: string }>(
    `insert into channels (id, workspace_id, name, type, topic, purpose, created_by, dm_key)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (workspace_id, dm_key) where dm_key is not null do nothing
     returning id`,
    [newId("ch"), input.workspaceId, input.name, input.type, input.topic, input.purpose, input.createdBy, key],
  );

  if (!rows[0]) {
    const existing = await tx.query<{ id: string }>(
      `select id from channels where workspace_id = $1 and dm_key = $2`,
      [input.workspaceId, key],
    );
    return { id: existing.rows[0]!.id, created: false };
  }

  await addChannelMembers(tx, rows[0].id, input.workspaceId, members);
  return { id: rows[0].id, created: true };
}

/** Idempotent bulk join; returns only the member ids that were newly added. */
export async function addChannelMembers(
  tx: Queryable,
  channelId: string,
  workspaceId: string,
  memberIds: string[],
): Promise<string[]> {
  if (memberIds.length === 0) return [];
  const { rows } = await tx.query<{ member_id: string }>(
    `with inserted as (
       insert into channel_members (channel_id, member_id, workspace_id, last_read_seq)
       select $1, m, $2, (select last_seq from channels where id = $1) from unnest($3::text[]) m
       on conflict do nothing
       returning member_id
     ), bump as (
       update channels set member_count = member_count + (select count(*) from inserted), updated_at = now()
       where id = $1 and exists (select 1 from inserted)
     )
     select member_id from inserted`,
    [channelId, workspaceId, memberIds],
  );
  return rows.map((r) => r.member_id);
}

export async function removeChannelMember(tx: Queryable, channelId: string, memberId: string): Promise<boolean> {
  const { rows } = await tx.query<{ removed: boolean }>(
    `with removed as (
       delete from channel_members where channel_id = $1 and member_id = $2 returning 1
     ), bump as (
       update channels set member_count = greatest(member_count - 1, 0), updated_at = now()
       where id = $1 and exists (select 1 from removed)
     )
     select exists (select 1 from removed) as removed`,
    [channelId, memberId],
  );
  return rows[0]?.removed ?? false;
}

/** Channels every new workspace member joins automatically. */
export async function findDefaultChannelIds(db: Queryable, workspaceId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `select id from channels where workspace_id = $1 and type = 'public' and lower(name) = 'general' and archived_at is null`,
    [workspaceId],
  );
  return rows.map((r) => r.id);
}

/** The subset of `ids` that are channels in this workspace. */
export async function filterWorkspaceChannelIds(db: Queryable, workspaceId: string, ids: string[]): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `select id from channels where workspace_id = $1 and id = any($2::text[])`,
    [workspaceId, ids],
  );
  return rows.map((r) => r.id);
}

export async function isChannelMember(db: Queryable, channelId: string, memberId: string): Promise<boolean> {
  const { rows } = await db.query(`select 1 from channel_members where channel_id = $1 and member_id = $2`, [
    channelId,
    memberId,
  ]);
  return rows.length > 0;
}

export async function listChannelMemberIds(db: Queryable, channelId: string): Promise<string[]> {
  const { rows } = await db.query<{ member_id: string }>(
    `select member_id from channel_members where channel_id = $1`,
    [channelId],
  );
  return rows.map((r) => r.member_id);
}

interface ChannelMemberRow {
  channel_id: string;
  member_id: string;
  last_read_seq: string;
  joined_at: Date;
}

function toChannelMember(row: ChannelMemberRow): ChannelMember {
  return {
    channelId: row.channel_id,
    memberId: row.member_id,
    lastReadSeq: Number(row.last_read_seq),
    joinedAt: isoRequired(row.joined_at),
  };
}

export async function findChannelMember(db: Queryable, channelId: string, memberId: string): Promise<ChannelMember | null> {
  const { rows } = await db.query<ChannelMemberRow>(
    `select * from channel_members where channel_id = $1 and member_id = $2`,
    [channelId, memberId],
  );
  return rows[0] ? toChannelMember(rows[0]) : null;
}

export async function listChannelMembers(
  db: Queryable,
  channelId: string,
  page: number,
  perPage: number,
): Promise<{ items: ChannelMember[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<ChannelMemberRow>(
      `select * from channel_members where channel_id = $1 order by joined_at, member_id limit $2 offset $3`,
      [channelId, perPage, (page - 1) * perPage],
    ),
    db.query<{ member_count: number }>(`select member_count from channels where id = $1`, [channelId]),
  ]);
  return { items: rows.rows.map(toChannelMember), total: count.rows[0]?.member_count ?? 0 };
}

export async function updateChannel(
  db: Queryable,
  id: string,
  patch: { name?: string | undefined; topic?: string | null | undefined; purpose?: string | null | undefined },
): Promise<boolean> {
  const { rowCount } = await db.query(
    `update channels set
       name = coalesce($2, name),
       topic = case when $3::boolean then $4 else topic end,
       purpose = case when $5::boolean then $6 else purpose end,
       updated_at = now()
     where id = $1`,
    [id, patch.name ?? null, patch.topic !== undefined, patch.topic ?? null, patch.purpose !== undefined, patch.purpose ?? null],
  );
  return (rowCount ?? 0) > 0;
}

/** Returns false when the channel was already in the requested state. */
export async function setChannelArchived(db: Queryable, id: string, archived: boolean): Promise<boolean> {
  const { rowCount } = await db.query(
    archived
      ? `update channels set archived_at = now(), updated_at = now() where id = $1 and archived_at is null`
      : `update channels set archived_at = null, updated_at = now() where id = $1 and archived_at is not null`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Advances the member's read cursor, never backwards (`greatest`) and never past
 * the channel's head — so out-of-order mark-read calls from multiple devices are safe.
 */
export async function markChannelRead(
  db: Queryable,
  channelId: string,
  memberId: string,
  seq: number | null,
): Promise<ChannelMember | null> {
  const { rows } = await db.query<ChannelMemberRow>(
    `update channel_members cm
     set last_read_seq = greatest(cm.last_read_seq, least(coalesce($3::bigint, c.last_seq), c.last_seq))
     from channels c
     where c.id = cm.channel_id and cm.channel_id = $1 and cm.member_id = $2
     returning cm.*`,
    [channelId, memberId, seq],
  );
  return rows[0] ? toChannelMember(rows[0]) : null;
}
