import type { AgentRun, AgentRunStep } from "@wire/types";
import { iso, isoRequired, type Queryable } from "../database.js";
import { newId } from "../ids.js";

interface AgentRunRow {
  id: string;
  workspace_id: string;
  agent_id: string;
  triggered_by_message_id: string | null;
  channel_id: string | null;
  status: AgentRun["status"];
  input: AgentRun["input"];
  output: string | null;
  error: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface AgentRunStepRow {
  id: string;
  run_id: string;
  seq: number;
  type: AgentRunStep["type"];
  data: unknown;
  created_at: Date;
}

function toAgentRun(row: AgentRunRow): AgentRun {
  return {
    id: row.id as AgentRun["id"],
    workspaceId: row.workspace_id,
    agentId: row.agent_id as AgentRun["agentId"],
    triggeredByMessageId: row.triggered_by_message_id as AgentRun["triggeredByMessageId"],
    channelId: row.channel_id,
    status: row.status,
    input: row.input,
    output: row.output,
    error: row.error,
    startedAt: iso(row.started_at),
    finishedAt: iso(row.finished_at),
    createdAt: isoRequired(row.created_at),
    updatedAt: isoRequired(row.updated_at),
  };
}

function toAgentRunStep(row: AgentRunStepRow): AgentRunStep {
  return {
    id: row.id as AgentRunStep["id"],
    runId: row.run_id as AgentRunStep["runId"],
    seq: row.seq,
    type: row.type,
    data: row.data,
    createdAt: isoRequired(row.created_at),
  };
}

export async function insertAgentRun(
  db: Queryable,
  input: {
    workspaceId: string;
    agentId: string;
    triggeredByMessageId: string | null;
    channelId: string | null;
    input: AgentRun["input"];
  },
): Promise<AgentRun> {
  const { rows } = await db.query<AgentRunRow>(
    `insert into agent_runs (id, workspace_id, agent_id, triggered_by_message_id, channel_id, input)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [
      newId("run"),
      input.workspaceId,
      input.agentId,
      input.triggeredByMessageId,
      input.channelId,
      input.input,
    ],
  );
  return toAgentRun(rows[0]!);
}

export async function updateAgentRun(
  db: Queryable,
  id: string,
  patch: {
    status?: AgentRun["status"];
    output?: string | null;
    error?: string | null;
    startedAt?: Date;
    finishedAt?: Date;
  },
): Promise<AgentRun | null> {
  const { rows } = await db.query<AgentRunRow>(
    `update agent_runs set
       status = coalesce($2, status),
       output = coalesce($3, output),
       error = coalesce($4, error),
       started_at = coalesce($5, started_at),
       finished_at = coalesce($6, finished_at),
       updated_at = now()
     where id = $1
     returning *`,
    [
      id,
      patch.status ?? null,
      patch.output ?? null,
      patch.error ?? null,
      patch.startedAt ?? null,
      patch.finishedAt ?? null,
    ],
  );
  return rows[0] ? toAgentRun(rows[0]) : null;
}

export async function findAgentRun(
  db: Queryable,
  workspaceId: string,
  id: string,
): Promise<AgentRun | null> {
  const { rows } = await db.query<AgentRunRow>(
    `select * from agent_runs where workspace_id = $1 and id = $2`,
    [workspaceId, id],
  );
  return rows[0] ? toAgentRun(rows[0]) : null;
}

export async function listAgentRunsForAgent(
  db: Queryable,
  workspaceId: string,
  agentId: string,
  page: number,
  perPage: number,
): Promise<{ items: AgentRun[]; total: number }> {
  const [rows, count] = await Promise.all([
    db.query<AgentRunRow>(
      `select * from agent_runs where workspace_id = $1 and agent_id = $2
       order by created_at desc limit $3 offset $4`,
      [workspaceId, agentId, perPage, (page - 1) * perPage],
    ),
    db.query<{ total: number }>(
      `select count(*)::int as total from agent_runs where workspace_id = $1 and agent_id = $2`,
      [workspaceId, agentId],
    ),
  ]);
  return { items: rows.rows.map(toAgentRun), total: count.rows[0]?.total ?? 0 };
}

export async function insertAgentRunStep(
  db: Queryable,
  input: { runId: string; seq: number; type: AgentRunStep["type"]; data: unknown },
): Promise<AgentRunStep> {
  const { rows } = await db.query<AgentRunStepRow>(
    `insert into agent_run_steps (id, run_id, seq, type, data) values ($1, $2, $3, $4, $5) returning *`,
    [newId("step"), input.runId, input.seq, input.type, input.data],
  );
  return toAgentRunStep(rows[0]!);
}

export async function listAgentRunSteps(db: Queryable, runId: string): Promise<AgentRunStep[]> {
  const { rows } = await db.query<AgentRunStepRow>(
    `select * from agent_run_steps where run_id = $1 order by seq asc`,
    [runId],
  );
  return rows.map(toAgentRunStep);
}
