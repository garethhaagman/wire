import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWorkspaces1700000000000 implements MigrationInterface {
  name = "CreateWorkspaces1700000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("create extension if not exists pgcrypto");
    await queryRunner.query(`
      create table "workspaces" (
        "id" text not null default ('ws_' || encode(gen_random_bytes(12), 'hex')),
        "org_id" text not null,
        "name" text not null,
        "data_region" text not null default 'us',
        "policies" jsonb not null default '{}',
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "PK_workspaces" primary key ("id")
      )
    `);
    await queryRunner.query(
      `create index "IDX_workspaces_org_id" on "workspaces" ("org_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table "workspaces"`);
  }
}
