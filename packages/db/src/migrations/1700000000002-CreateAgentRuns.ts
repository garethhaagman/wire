import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Agent execution — a run is one harness invocation (human message mention, or a
 * direct POST .../agents/:id/runs), agent_run_steps is its internal trace
 * (model calls, tool calls/results, the final answer). audit_events.agent_run_id
 * (added in CreateMessagingSchema) already anticipates this table.
 */
export class CreateAgentRuns1700000000002 implements MigrationInterface {
  name = "CreateAgentRuns1700000000002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table "agent_runs" (
        "id" text primary key,
        "workspace_id" text not null,
        "agent_id" text not null references "agents" ("id") on delete cascade,
        "triggered_by_message_id" text references "messages" ("id") on delete set null,
        "channel_id" text,
        "status" text not null default 'queued' check ("status" in ('queued', 'running', 'succeeded', 'failed')),
        "input" jsonb not null,
        "output" text,
        "error" text,
        "started_at" timestamptz,
        "finished_at" timestamptz,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(`create index "IDX_agent_runs_agent_created" on "agent_runs" ("agent_id", "created_at" desc)`);
    await queryRunner.query(`create index "IDX_agent_runs_workspace" on "agent_runs" ("workspace_id")`);

    await queryRunner.query(`
      create table "agent_run_steps" (
        "id" text primary key,
        "run_id" text not null references "agent_runs" ("id") on delete cascade,
        "seq" integer not null,
        "type" text not null check ("type" in ('model_call', 'tool_call', 'tool_result', 'final')),
        "data" jsonb not null,
        "created_at" timestamptz not null default now(),
        constraint "UQ_agent_run_steps_run_seq" unique ("run_id", "seq")
      )
    `);
    await queryRunner.query(`create index "IDX_agent_run_steps_run" on "agent_run_steps" ("run_id", "seq")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table if exists "agent_run_steps"`);
    await queryRunner.query(`drop table if exists "agent_runs"`);
  }
}
