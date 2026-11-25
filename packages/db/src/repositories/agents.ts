import type { Agent } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface AgentRow {
  created_at: Date;
  handle: string;
  harness_id: string;
  id: string;
  permission_set_id: string | null;
  status: Agent["status"];
  updated_at: Date;
  workspace_id: string;
}

function toAgent(row: AgentRow): Agent {
  return {
    id: row.id as Agent["id"],
    workspaceId: row.workspace_id,
    handle: row.handle,
    harnessId: row.harness_id,
    permissionSetId: row.permission_set_id,
    status: row.status,
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
  };
}

export async function listAgents(
  db: Queryable,
  workspaceId: string,
  page: number,
  perPage: number
): Promise<{ items: Agent[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<AgentRow>(
      `select * from agents where workspace_id = $1 and status <> 'deleted'
       order by handle limit $2 offset $3`,
      [workspaceId, perPage, (page - 1) * perPage]
    ),
    db.query<{ total: number }>(
      `select count(*)::int as total from agents where workspace_id = $1 and status <> 'deleted'`,
      [workspaceId]
    ),
  ]);
  return { items: rows.rows.map(toAgent), total: count.rows[0]?.total ?? 0 };
}

export async function findAgent(
  db: Queryable,
  workspaceId: string,
  id: string
): Promise<Agent | null> {
  const { rows } = await db.query<AgentRow>(
    `select * from agents where workspace_id = $1 and id = $2 and status <> 'deleted'`,
    [workspaceId, id]
  );
  return rows[0] ? toAgent(rows[0]) : null;
}

/** Used by @handle mention parsing on message post — only active agents can be triggered. */
export async function findAgentByHandle(
  db: Queryable,
  workspaceId: string,
  handle: string
): Promise<Agent | null> {
  const { rows } = await db.query<AgentRow>(
    `select * from agents where workspace_id = $1 and handle = $2 and status = 'active'`,
    [workspaceId, handle]
  );
  return rows[0] ? toAgent(rows[0]) : null;
}

/** A handle clash surfaces as a unique violation on UQ_agents_workspace_handle. */
export async function insertAgent(
  db: Queryable,
  input: { workspaceId: string; handle: string; harnessId: string }
): Promise<Agent> {
  const { rows } = await db.query<AgentRow>(
    "insert into agents (id, workspace_id, handle, harness_id) values ($1, $2, $3, $4) returning *",
    [newId("agt"), input.workspaceId, input.handle, input.harnessId]
  );
  return toAgent(rows[0]!);
}

export async function updateAgent(
  db: Queryable,
  workspaceId: string,
  id: string,
  patch: { harnessId?: string; status?: Agent["status"] }
): Promise<Agent | null> {
  const { rows } = await db.query<AgentRow>(
    `update agents set harness_id = coalesce($3, harness_id), status = coalesce($4, status), updated_at = now()
     where workspace_id = $1 and id = $2 and status <> 'deleted' returning *`,
    [workspaceId, id, patch.harnessId ?? null, patch.status ?? null]
  );
  return rows[0] ? toAgent(rows[0]) : null;
}
