/**
 * Seeds a local dev account and workspace. Idempotent — safe to re-run; existing rows
 * are left alone. The user is created through Better Auth itself so the password is
 * hashed exactly as a real sign-up would be. Refuses to run with NODE_ENV=production.
 *
 * Usage: bun run db:seed  (or `make seed`; `make dev` runs it automatically)
 */
import { parseApiEnv } from "@wire/config";
import { Database, insertWorkspace } from "@wire/db";
import { createAuth } from "../src/auth/auth.config.js";

const DEV_USER = { email: "dev@wire.local", password: "wire-dev-password", name: "Dev User" };
const DEV_WORKSPACE = { name: "Wire Dev", dataRegion: "us" };

async function main(): Promise<void> {
  const env = parseApiEnv();
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed dev data with NODE_ENV=production");
  }

  const db = new Database({ url: env.DATABASE_URL, poolMax: 2 });

  try {
    const existing = await db.query<{ id: string }>(`select id from "user" where email = $1`, [DEV_USER.email]);
    let userId = existing.rows[0]?.id;
    if (userId) {
      console.warn(`user       ${DEV_USER.email} (exists)`);
    } else {
      const { user } = await createAuth(env, db.primary).api.signUpEmail({ body: DEV_USER });
      userId = user.id;
      console.warn(`user       ${DEV_USER.email} (created)`);
    }

    const found = await db.query<{ id: string }>(
      `select w.id from workspaces w
       join members m on m.workspace_id = w.id and m.user_id = $1 and m.deactivated_at is null
       where w.name = $2 limit 1`,
      [userId, DEV_WORKSPACE.name],
    );
    let workspaceId = found.rows[0]?.id;
    if (!workspaceId) {
      const owner = { userId, email: DEV_USER.email, displayName: DEV_USER.name };
      // org_id is derived from the creating user's id (see WorkspacesService.create).
      const created = await db.tx((tx) => insertWorkspace(tx, { orgId: userId, ...DEV_WORKSPACE, owner }));
      workspaceId = created.workspace.id;
    }
    console.warn(`workspace  ${DEV_WORKSPACE.name} ${workspaceId} (${found.rows[0] ? "exists" : "created"})`);
    console.warn(`\nsign in with ${DEV_USER.email} / ${DEV_USER.password}`);
  } finally {
    await db.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
