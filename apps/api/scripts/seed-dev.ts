/**
 * Seeds a local dev account and workspace. Idempotent — safe to re-run; existing rows
 * are left alone. The user is created through Better Auth itself so the password is
 * hashed exactly as a real sign-up would be. Refuses to run with NODE_ENV=production.
 *
 * Usage: bun run db:seed  (or `make seed`; `make dev` runs it automatically)
 */
import "reflect-metadata";
import { DataSource } from "typeorm";
import { parseApiEnv } from "@wire/config";
import { buildDataSourceOptions, createPgPool, WorkspaceEntity, WorkspacesRepository } from "@wire/db";
import { createAuth } from "../src/auth/auth.config.js";

const DEV_USER = { email: "dev@wire.local", password: "wire-dev-password", name: "Dev User" };
const DEV_WORKSPACE = { name: "Wire Dev", dataRegion: "us" };

async function main(): Promise<void> {
  const env = parseApiEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed dev data with NODE_ENV=production");
  }

  const pool = createPgPool(env.DATABASE_URL);
  const dataSource = new DataSource(buildDataSourceOptions(env.DATABASE_URL));

  try {
    const existing = await pool.query<{ id: string }>(`select id from "user" where email = $1`, [DEV_USER.email]);
    let userId = existing.rows[0]?.id;
    if (userId) {
      console.warn(`user       ${DEV_USER.email} (exists)`);
    } else {
      const { user } = await createAuth(env, pool).api.signUpEmail({ body: DEV_USER });
      userId = user.id;
      console.warn(`user       ${DEV_USER.email} (created)`);
    }

    await dataSource.initialize();
    const entities = dataSource.getRepository(WorkspaceEntity);
    // Workspaces are scoped by org_id, which the API currently derives from the session
    // user's id (see WorkspacesController), so the dev user's id is its org id.
    const found = await entities.findOne({ where: { orgId: userId, name: DEV_WORKSPACE.name } });
    const workspace = found ?? (await new WorkspacesRepository(entities).create(userId, DEV_WORKSPACE));
    console.warn(`workspace  ${workspace.name} ${workspace.id} (${found ? "exists" : "created"})`);
    console.warn(`\nsign in with ${DEV_USER.email} / ${DEV_USER.password}`);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
