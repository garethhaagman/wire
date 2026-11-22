import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Core messaging schema — members, channels, messages, threads, reactions, pins,
 * bookmarks, agents, files, webhooks, audit, and the transactional event outbox.
 *
 * Every table carries `workspace_id` even where it's derivable through a join: it's
 * the tenancy filter on every query and the distribution key if this schema is ever
 * sharded per workspace (Citus / app-level shards). See
 * internal-docs/data-model/scaling.md.
 */
export class CreateMessagingSchema1700000000001 implements MigrationInterface {
  name = "CreateMessagingSchema1700000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table "workspaces"
        add column "created_by" text,
        add column "ui_config" jsonb,
        add column "ui_config_locks" jsonb not null default '[]'
    `);

    await queryRunner.query(`
      create table "members" (
        "id" text primary key,
        "workspace_id" text not null references "workspaces" ("id") on delete cascade,
        "user_id" text,
        "email" text not null,
        "display_name" text not null,
        "role" text not null check ("role" in ('owner', 'admin', 'member', 'guest')),
        "preferences" jsonb not null default '{}',
        "ui_config_override" jsonb,
        "deactivated_at" timestamptz,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(`create unique index "UQ_members_workspace_email" on "members" ("workspace_id", lower("email"))`);
    await queryRunner.query(
      `create unique index "UQ_members_workspace_user" on "members" ("workspace_id", "user_id") where "user_id" is not null`,
    );
    await queryRunner.query(`create index "IDX_members_user" on "members" ("user_id") where "user_id" is not null`);
    await queryRunner.query(`create index "IDX_members_unclaimed_email" on "members" (lower("email")) where "user_id" is null`);

    await queryRunner.query(`
      create table "channels" (
        "id" text primary key,
        "workspace_id" text not null references "workspaces" ("id") on delete cascade,
        "name" text not null,
        "type" text not null check ("type" in ('public', 'private', 'dm', 'group_dm')),
        "topic" text,
        "purpose" text,
        "created_by" text,
        "dm_key" text,
        "last_seq" bigint not null default 0,
        "last_message_at" timestamptz,
        "member_count" integer not null default 0,
        "archived_at" timestamptz,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(
      `create unique index "UQ_channels_workspace_name" on "channels" ("workspace_id", lower("name")) where "type" in ('public', 'private')`,
    );
    await queryRunner.query(
      `create unique index "UQ_channels_workspace_dm_key" on "channels" ("workspace_id", "dm_key") where "dm_key" is not null`,
    );
    await queryRunner.query(`create index "IDX_channels_workspace_type" on "channels" ("workspace_id", "type")`);

    await queryRunner.query(`
      create table "channel_members" (
        "channel_id" text not null references "channels" ("id") on delete cascade,
        "member_id" text not null references "members" ("id") on delete cascade,
        "workspace_id" text not null,
        "last_read_seq" bigint not null default 0,
        "joined_at" timestamptz not null default now(),
        primary key ("channel_id", "member_id")
      )
    `);
    await queryRunner.query(`create index "IDX_channel_members_member" on "channel_members" ("member_id")`);

    await queryRunner.query(`
      create table "messages" (
        "id" text primary key,
        "workspace_id" text not null,
        "channel_id" text not null references "channels" ("id") on delete cascade,
        "seq" bigint not null,
        "thread_root_id" text references "messages" ("id") on delete cascade,
        "broadcast" boolean not null default false,
        "actor_id" text not null,
        "actor_type" text not null check ("actor_type" in ('human', 'agent', 'system')),
        "body" text not null,
        "revision" integer not null default 1,
        "reply_count" integer not null default 0,
        "last_reply_at" timestamptz,
        "last_reply_seq" bigint,
        "reaction_counts" jsonb not null default '{}',
        "edited_at" timestamptz,
        "deleted_at" timestamptz,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "search_vector" tsvector generated always as (to_tsvector('simple', "body")) stored,
        constraint "UQ_messages_channel_seq" unique ("channel_id", "seq")
      )
    `);
    // Channel history reads only top-level messages and thread broadcasts; a partial
    // index keeps that keyset scan from walking every thread reply.
    await queryRunner.query(
      `create index "IDX_messages_channel_history" on "messages" ("channel_id", "seq") where "thread_root_id" is null or "broadcast"`,
    );
    await queryRunner.query(
      `create index "IDX_messages_thread" on "messages" ("thread_root_id", "seq") where "thread_root_id" is not null`,
    );
    await queryRunner.query(`create index "IDX_messages_search" on "messages" using gin ("search_vector")`);

    await queryRunner.query(`
      create table "message_revisions" (
        "message_id" text not null references "messages" ("id") on delete cascade,
        "revision" integer not null,
        "body" text not null,
        "edited_by" text not null,
        "created_at" timestamptz not null default now(),
        primary key ("message_id", "revision")
      )
    `);

    await queryRunner.query(`
      create table "thread_participants" (
        "thread_root_id" text not null references "messages" ("id") on delete cascade,
        "member_id" text not null references "members" ("id") on delete cascade,
        "workspace_id" text not null,
        "last_read_seq" bigint not null default 0,
        primary key ("thread_root_id", "member_id")
      )
    `);
    await queryRunner.query(`create index "IDX_thread_participants_member" on "thread_participants" ("member_id")`);

    await queryRunner.query(`
      create table "reactions" (
        "id" text primary key,
        "workspace_id" text not null,
        "message_id" text not null references "messages" ("id") on delete cascade,
        "actor_id" text not null,
        "emoji" text not null,
        "created_at" timestamptz not null default now(),
        constraint "UQ_reactions_message_actor_emoji" unique ("message_id", "actor_id", "emoji")
      )
    `);

    await queryRunner.query(`
      create table "pins" (
        "id" text primary key,
        "workspace_id" text not null,
        "channel_id" text not null references "channels" ("id") on delete cascade,
        "message_id" text not null references "messages" ("id") on delete cascade,
        "pinned_by" text not null,
        "created_at" timestamptz not null default now(),
        constraint "UQ_pins_channel_message" unique ("channel_id", "message_id")
      )
    `);

    await queryRunner.query(`
      create table "bookmarks" (
        "id" text primary key,
        "workspace_id" text not null,
        "member_id" text not null references "members" ("id") on delete cascade,
        "message_id" text not null references "messages" ("id") on delete cascade,
        "created_at" timestamptz not null default now(),
        constraint "UQ_bookmarks_member_message" unique ("member_id", "message_id")
      )
    `);
    await queryRunner.query(`create index "IDX_bookmarks_member_created" on "bookmarks" ("member_id", "created_at" desc)`);

    await queryRunner.query(`
      create table "agents" (
        "id" text primary key,
        "workspace_id" text not null references "workspaces" ("id") on delete cascade,
        "handle" text not null,
        "harness_id" text not null,
        "permission_set_id" text,
        "status" text not null default 'active' check ("status" in ('active', 'paused', 'deleted')),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(
      `create unique index "UQ_agents_workspace_handle" on "agents" ("workspace_id", "handle") where "status" <> 'deleted'`,
    );

    await queryRunner.query(`
      create table "files" (
        "id" text primary key,
        "workspace_id" text not null,
        "channel_id" text not null references "channels" ("id") on delete cascade,
        "uploaded_by" text not null,
        "name" text not null,
        "mime" text not null,
        "size_bytes" bigint not null,
        "virus_scan_status" text not null default 'pending' check ("virus_scan_status" in ('pending', 'clean', 'infected')),
        "created_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(`create index "IDX_files_channel_created" on "files" ("channel_id", "created_at" desc)`);

    await queryRunner.query(`
      create table "webhook_endpoints" (
        "id" text primary key,
        "workspace_id" text not null references "workspaces" ("id") on delete cascade,
        "url" text not null,
        "enabled_events" text[] not null,
        "channel_filter" text[],
        "secret_ciphertext" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(`create index "IDX_webhook_endpoints_workspace" on "webhook_endpoints" ("workspace_id")`);

    // Transactional outbox: written in the same transaction as the mutation it
    // describes, published to Redis + fanned out to webhook deliveries by the relay.
    await queryRunner.query(`
      create table "events" (
        "seq" bigserial primary key,
        "id" text not null unique,
        "workspace_id" text not null,
        "type" text not null,
        "channel_id" text,
        "data" jsonb not null,
        "created_at" timestamptz not null default now(),
        "published_at" timestamptz
      )
    `);
    await queryRunner.query(`create index "IDX_events_unpublished" on "events" ("seq") where "published_at" is null`);
    await queryRunner.query(`create index "IDX_events_workspace_seq" on "events" ("workspace_id", "seq")`);

    await queryRunner.query(`
      create table "webhook_deliveries" (
        "id" bigserial primary key,
        "endpoint_id" text not null references "webhook_endpoints" ("id") on delete cascade,
        "event_id" text not null,
        "workspace_id" text not null,
        "payload" jsonb not null,
        "status" text not null default 'pending' check ("status" in ('pending', 'succeeded', 'failed')),
        "attempts" integer not null default 0,
        "next_attempt_at" timestamptz not null default now(),
        "last_status_code" integer,
        "last_error" text,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "UQ_webhook_deliveries_endpoint_event" unique ("endpoint_id", "event_id")
      )
    `);
    await queryRunner.query(
      `create index "IDX_webhook_deliveries_due" on "webhook_deliveries" ("next_attempt_at") where "status" = 'pending'`,
    );

    await queryRunner.query(`
      create table "audit_events" (
        "id" text primary key,
        "workspace_id" text not null,
        "actor_id" text not null,
        "ip" text,
        "resource" text not null,
        "resource_id" text,
        "action" text not null,
        "agent_run_id" text,
        "request_id" text,
        "created_at" timestamptz not null default now()
      )
    `);
    await queryRunner.query(`create index "IDX_audit_events_workspace_created" on "audit_events" ("workspace_id", "created_at" desc)`);

    // Backfill: workspaces created before members existed get their creator (org_id
    // is the creating user's id in the skeleton tenancy model) as owner. Guarded
    // because Better Auth's "user" table is created after TypeORM migrations on a
    // fresh database — in which case there are no workspaces to backfill anyway.
    await queryRunner.query(`
      do $$
      begin
        if exists (select from information_schema.tables where table_name = 'user') then
          insert into "members" ("id", "workspace_id", "user_id", "email", "display_name", "role")
          select 'mem_' || encode(gen_random_bytes(12), 'hex'), w."id", u."id", u."email", u."name", 'owner'
          from "workspaces" w
          join "user" u on u."id" = w."org_id"
          on conflict do nothing;
          update "workspaces" set "created_by" = "org_id" where "created_by" is null;
        end if;
      end $$
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      "audit_events",
      "webhook_deliveries",
      "events",
      "webhook_endpoints",
      "files",
      "agents",
      "bookmarks",
      "pins",
      "reactions",
      "thread_participants",
      "message_revisions",
      "messages",
      "channel_members",
      "channels",
      "members",
    ]) {
      await queryRunner.query(`drop table if exists "${table}"`);
    }
    await queryRunner.query(`
      alter table "workspaces"
        drop column "created_by",
        drop column "ui_config",
        drop column "ui_config_locks"
    `);
  }
}
