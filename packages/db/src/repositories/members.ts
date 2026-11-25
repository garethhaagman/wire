import type { Member, MemberPreferences } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface MemberRow {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  role: Member["role"];
  created_at: Date;
  updated_at: Date;
}

function toMember(row: MemberRow): Member {
  return {
    id: row.id as Member["id"],
    workspaceId: row.workspace_id,
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
  };
}

const ACTIVE = `deactivated_at is null`;

export async function listMembers(
  db: Queryable,
  workspaceId: string,
  options: { page: number; perPage: number; search?: string | undefined },
): Promise<{ items: Member[]; total: number }> {
  const search = options.search ? `%${options.search.replace(/[%_\\]/g, "\\$&")}%` : null;
  const where = `workspace_id = $1 and ${ACTIVE} and ($2::text is null or display_name ilike $2 or email ilike $2)`;
  const [rows, count] = await Promise.all([
    db.query<MemberRow>(
      `select * from members where ${where} order by display_name, id limit $3 offset $4`,
      [workspaceId, search, options.perPage, (options.page - 1) * options.perPage],
    ),
    db.query<{ total: number }>(`select count(*)::int as total from members where ${where}`, [
      workspaceId,
      search,
    ]),
  ]);
  return { items: rows.rows.map(toMember), total: count.rows[0]?.total ?? 0 };
}

export async function findMember(
  db: Queryable,
  workspaceId: string,
  id: string,
): Promise<Member | null> {
  const { rows } = await db.query<MemberRow>(
    `select * from members where workspace_id = $1 and id = $2 and ${ACTIVE}`,
    [workspaceId, id],
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export async function findMemberByUser(
  db: Queryable,
  workspaceId: string,
  userId: string,
): Promise<Member | null> {
  const { rows } = await db.query<MemberRow>(
    `select * from members where workspace_id = $1 and user_id = $2 and ${ACTIVE}`,
    [workspaceId, userId],
  );
  return rows[0] ? toMember(rows[0]) : null;
}

/** Active member ids among `ids` in the workspace — validates channel/DM invitees. */
export async function filterActiveMemberIds(
  db: Queryable,
  workspaceId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<{ id: string }>(
    `select id from members where workspace_id = $1 and id = any($2::text[]) and ${ACTIVE}`,
    [workspaceId, ids],
  );
  return rows.map((r) => r.id);
}

/**
 * Binds pending invites for this email to the signing-in user (the "claim" step of
 * internal-docs/import/claim-flow.md). Atomic: `user_id is null` in the WHERE means
 * two concurrent claims can't both win.
 */
export async function claimInvitesByEmail(
  db: Queryable,
  userId: string,
  email: string,
  workspaceId?: string,
): Promise<Member[]> {
  const { rows } = await db.query<MemberRow>(
    `update members set user_id = $1, updated_at = now()
     where lower(email) = lower($2) and user_id is null and ${ACTIVE}
       and ($3::text is null or workspace_id = $3)
       and not exists (
         select 1 from members other where other.workspace_id = members.workspace_id and other.user_id = $1
       )
     returning *`,
    [userId, email, workspaceId ?? null],
  );
  return rows.map(toMember);
}

export async function findUserByEmail(
  db: Queryable,
  email: string,
): Promise<{ id: string; emailVerified: boolean } | null> {
  const { rows } = await db.query<{ id: string; emailVerified: boolean }>(
    `select id, "emailVerified" from "user" where lower(email) = lower($1)`,
    [email],
  );
  return rows[0] ?? null;
}

/**
 * Invites (or re-activates) a member. Returns null when an active member with this
 * email already exists — the caller maps that to 409.
 */
export async function upsertMember(
  db: Queryable,
  input: {
    workspaceId: string;
    email: string;
    displayName: string;
    role: Member["role"];
    userId: string | null;
  },
): Promise<Member | null> {
  const { rows } = await db.query<MemberRow>(
    `insert into members (id, workspace_id, user_id, email, display_name, role)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (workspace_id, lower(email)) do update
       set display_name = excluded.display_name, role = excluded.role,
           user_id = coalesce(members.user_id, excluded.user_id),
           deactivated_at = null, updated_at = now()
       where members.deactivated_at is not null
     returning *`,
    [newId("mem"), input.workspaceId, input.userId, input.email, input.displayName, input.role],
  );
  return rows[0] ? toMember(rows[0]) : null;
}

export async function updateMember(
  db: Queryable,
  workspaceId: string,
  id: string,
  patch: { displayName?: string; role?: Member["role"] },
): Promise<Member | null> {
  const { rows } = await db.query<MemberRow>(
    `update members set display_name = coalesce($3, display_name), role = coalesce($4, role), updated_at = now()
     where workspace_id = $1 and id = $2 and ${ACTIVE} returning *`,
    [workspaceId, id, patch.displayName ?? null, patch.role ?? null],
  );
  return rows[0] ? toMember(rows[0]) : null;
}

/** Locks and counts active owners — call inside a transaction before demoting/removing an owner. */
export async function lockActiveOwnerIds(tx: Queryable, workspaceId: string): Promise<string[]> {
  const { rows } = await tx.query<{ id: string }>(
    `select id from members where workspace_id = $1 and role = 'owner' and ${ACTIVE} for update`,
    [workspaceId],
  );
  return rows.map((r) => r.id);
}

/**
 * Soft-removes a member and drops their channel memberships, keeping
 * channels.member_count consistent in the same transaction.
 */
export async function deactivateMember(
  tx: Queryable,
  workspaceId: string,
  id: string,
): Promise<Member | null> {
  const { rows } = await tx.query<MemberRow>(
    `update members set deactivated_at = now(), updated_at = now()
     where workspace_id = $1 and id = $2 and ${ACTIVE} returning *`,
    [workspaceId, id],
  );
  if (!rows[0]) return null;
  await tx.query(
    `with removed as (delete from channel_members where member_id = $1 returning channel_id)
     update channels set member_count = greatest(member_count - 1, 0)
     where id in (select channel_id from removed)`,
    [id],
  );
  return toMember(rows[0]);
}

export async function getPreferences(db: Queryable, memberId: string): Promise<MemberPreferences> {
  const { rows } = await db.query<{ preferences: Partial<MemberPreferences> }>(
    `select preferences from members where id = $1`,
    [memberId],
  );
  return normalizePreferences(rows[0]?.preferences ?? {});
}

/** Shallow jsonb merge in one statement — concurrent updates to different keys don't clobber each other. */
export async function mergePreferences(
  db: Queryable,
  memberId: string,
  patch: Partial<MemberPreferences>,
): Promise<MemberPreferences> {
  const { rows } = await db.query<{ preferences: Partial<MemberPreferences> }>(
    `update members set preferences = preferences || $2::jsonb, updated_at = now() where id = $1 returning preferences`,
    [memberId, JSON.stringify(patch)],
  );
  return normalizePreferences(rows[0]?.preferences ?? {});
}

function normalizePreferences(raw: Partial<MemberPreferences>): MemberPreferences {
  return {
    starredChannelIds: raw.starredChannelIds ?? [],
    mutedChannelIds: raw.mutedChannelIds ?? [],
  };
}

export async function getUiConfigOverride(db: Queryable, memberId: string): Promise<unknown> {
  const { rows } = await db.query<{ ui_config_override: unknown }>(
    `select ui_config_override from members where id = $1`,
    [memberId],
  );
  return rows[0]?.ui_config_override ?? null;
}

export async function setUiConfigOverride(
  db: Queryable,
  memberId: string,
  override: unknown,
): Promise<void> {
  await db.query(
    `update members set ui_config_override = $2::jsonb, updated_at = now() where id = $1`,
    [memberId, JSON.stringify(override)],
  );
}
