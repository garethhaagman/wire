import type { Workspace } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface WorkspaceRow {
  created_at: Date;
  data_region: string;
  id: string;
  name: string;
  org_id: string;
  updated_at: Date;
}

function toWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id as Workspace["id"],
    orgId: row.org_id,
    name: row.name,
    dataRegion: row.data_region,
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
  };
}

/** Workspaces the user is an active member of — membership is the tenancy boundary. */
export async function listWorkspacesForUser(
  db: Queryable,
  userId: string,
  page: number,
  perPage: number
): Promise<{ items: Workspace[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<WorkspaceRow>(
      `select w.* from workspaces w
       join members m on m.workspace_id = w.id and m.user_id = $1 and m.deactivated_at is null
       order by w.created_at desc
       limit $2 offset $3`,
      [userId, perPage, (page - 1) * perPage]
    ),
    db.query<{ total: number }>(
      "select count(*)::int as total from members where user_id = $1 and deactivated_at is null",
      [userId]
    ),
  ]);
  return {
    items: rows.rows.map(toWorkspace),
    total: count.rows[0]?.total ?? 0,
  };
}

export async function findWorkspace(
  db: Queryable,
  id: string
): Promise<Workspace | null> {
  const { rows } = await db.query<WorkspaceRow>(
    "select * from workspaces where id = $1",
    [id]
  );
  return rows[0] ? toWorkspace(rows[0]) : null;
}

export interface WorkspaceOwnerInput {
  displayName: string;
  email: string;
  userId: string;
}

/**
 * Creates the workspace, its owner member, and a #general channel the owner has
 * joined — all in the caller's transaction so a workspace never exists without an
 * owner who can administer it.
 */
export async function insertWorkspace(
  tx: Queryable,
  input: {
    orgId: string;
    name: string;
    dataRegion: string;
    owner: WorkspaceOwnerInput;
  }
): Promise<{
  workspace: Workspace;
  ownerMemberId: string;
  generalChannelId: string;
}> {
  const workspaceId = newId("ws");
  const memberId = newId("mem");
  const channelId = newId("ch");

  const { rows } = await tx.query<WorkspaceRow>(
    `insert into workspaces (id, org_id, name, data_region, created_by)
     values ($1, $2, $3, $4, $5) returning *`,
    [workspaceId, input.orgId, input.name, input.dataRegion, input.owner.userId]
  );
  await tx.query(
    `insert into members (id, workspace_id, user_id, email, display_name, role)
     values ($1, $2, $3, $4, $5, 'owner')`,
    [
      memberId,
      workspaceId,
      input.owner.userId,
      input.owner.email,
      input.owner.displayName,
    ]
  );
  await tx.query(
    `insert into channels (id, workspace_id, name, type, purpose, created_by, member_count)
     values ($1, $2, 'general', 'public', 'Workspace-wide announcements and conversation', $3, 1)`,
    [channelId, workspaceId, memberId]
  );
  await tx.query(
    "insert into channel_members (channel_id, member_id, workspace_id) values ($1, $2, $3)",
    [channelId, memberId, workspaceId]
  );

  return {
    workspace: toWorkspace(rows[0]!),
    ownerMemberId: memberId,
    generalChannelId: channelId,
  };
}

export async function updateWorkspace(
  db: Queryable,
  id: string,
  patch: { name?: string }
): Promise<Workspace | null> {
  const { rows } = await db.query<WorkspaceRow>(
    "update workspaces set name = coalesce($2, name), updated_at = now() where id = $1 returning *",
    [id, patch.name ?? null]
  );
  return rows[0] ? toWorkspace(rows[0]) : null;
}

export interface OrgUiConfigLayer {
  locks: unknown;
  override: unknown;
}

export async function getOrgUiConfig(
  db: Queryable,
  workspaceId: string
): Promise<OrgUiConfigLayer | null> {
  const { rows } = await db.query<{
    ui_config: unknown;
    ui_config_locks: unknown;
  }>("select ui_config, ui_config_locks from workspaces where id = $1", [
    workspaceId,
  ]);
  const [row] = rows;
  if (!row || row.ui_config === null) {
    return null;
  }
  return { override: row.ui_config, locks: row.ui_config_locks };
}

export async function setOrgUiConfig(
  db: Queryable,
  workspaceId: string,
  layer: OrgUiConfigLayer
): Promise<void> {
  await db.query(
    "update workspaces set ui_config = $2::jsonb, ui_config_locks = $3::jsonb, updated_at = now() where id = $1",
    [workspaceId, JSON.stringify(layer.override), JSON.stringify(layer.locks)]
  );
}
