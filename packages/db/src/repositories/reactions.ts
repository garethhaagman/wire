import type { Pin, Reaction } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

/** Upper bound on a single reactions list response; counts live on the message itself. */
const MAX_REACTIONS_LISTED = 1000;

interface ReactionRow {
  id: string;
  message_id: string;
  actor_id: string;
  emoji: string;
  created_at: Date;
}

function toReaction(row: ReactionRow): Reaction {
  return {
    id: row.id as Reaction["id"],
    messageId: row.message_id,
    actorId: row.actor_id,
    emoji: row.emoji,
    createdAt: isoRequired(row.created_at),
  };
}

export async function listReactions(db: Queryable, messageId: string): Promise<Reaction[]> {
  const { rows } = await db.query<ReactionRow>(
    `select * from reactions where message_id = $1 order by created_at, id limit $2`,
    [messageId, MAX_REACTIONS_LISTED],
  );
  return rows.map(toReaction);
}

/**
 * The unique (message_id, actor_id, emoji) constraint makes "add" race-free: of two
 * concurrent identical requests exactly one inserts, and only that one bumps the
 * denormalized count. Returns null on a duplicate.
 */
export async function insertReaction(
  tx: Queryable,
  input: { workspaceId: string; messageId: string; actorId: string; emoji: string },
): Promise<Reaction | null> {
  const { rows } = await tx.query<ReactionRow>(
    `insert into reactions (id, workspace_id, message_id, actor_id, emoji) values ($1, $2, $3, $4, $5)
     on conflict (message_id, actor_id, emoji) do nothing returning *`,
    [newId("rxn"), input.workspaceId, input.messageId, input.actorId, input.emoji],
  );
  if (!rows[0]) return null;

  await tx.query(
    `update messages
     set reaction_counts = jsonb_set(reaction_counts, array[$2::text], to_jsonb(coalesce((reaction_counts ->> $2)::int, 0) + 1))
     where id = $1`,
    [input.messageId, input.emoji],
  );
  return toReaction(rows[0]);
}

export async function deleteReaction(
  tx: Queryable,
  input: { messageId: string; actorId: string; emoji: string },
): Promise<boolean> {
  const { rowCount } = await tx.query(
    `delete from reactions where message_id = $1 and actor_id = $2 and emoji = $3`,
    [input.messageId, input.actorId, input.emoji],
  );
  if (!rowCount) return false;

  await tx.query(
    `update messages
     set reaction_counts = case
       when coalesce((reaction_counts ->> $2)::int, 0) <= 1 then reaction_counts - $2::text
       else jsonb_set(reaction_counts, array[$2::text], to_jsonb((reaction_counts ->> $2)::int - 1))
     end
     where id = $1`,
    [input.messageId, input.emoji],
  );
  return true;
}

interface PinRow {
  id: string;
  channel_id: string;
  message_id: string;
  pinned_by: string;
  created_at: Date;
}

function toPin(row: PinRow): Pin {
  return {
    id: row.id as Pin["id"],
    channelId: row.channel_id,
    messageId: row.message_id,
    pinnedBy: row.pinned_by,
    createdAt: isoRequired(row.created_at),
  };
}

export async function listPins(db: Queryable, channelId: string): Promise<Pin[]> {
  const { rows } = await db.query<PinRow>(
    `select * from pins where channel_id = $1 order by created_at desc limit 1000`,
    [channelId],
  );
  return rows.map(toPin);
}

/** Returns null when the message is already pinned (unique on channel + message). */
export async function insertPin(
  db: Queryable,
  input: { workspaceId: string; channelId: string; messageId: string; pinnedBy: string },
): Promise<Pin | null> {
  const { rows } = await db.query<PinRow>(
    `insert into pins (id, workspace_id, channel_id, message_id, pinned_by) values ($1, $2, $3, $4, $5)
     on conflict (channel_id, message_id) do nothing returning *`,
    [newId("pin"), input.workspaceId, input.channelId, input.messageId, input.pinnedBy],
  );
  return rows[0] ? toPin(rows[0]) : null;
}

export async function deletePin(
  db: Queryable,
  channelId: string,
  pinId: string,
): Promise<Pin | null> {
  const { rows } = await db.query<PinRow>(
    `delete from pins where channel_id = $1 and id = $2 returning *`,
    [channelId, pinId],
  );
  return rows[0] ? toPin(rows[0]) : null;
}
