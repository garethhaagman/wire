import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPgPool } from "./pg-pool.js";

/**
 * Better Auth owns its own schema independently of TypeORM (it uses its own Kysely/pg
 * adapter, not TypeORM entities) — see packages/db/migrations/0002_create_auth_tables.sql
 * header for why these columns must stay camelCase. This script just applies that one
 * file idempotently; app-table migrations go through TypeORM (`migration:run`).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authSchemaFile = path.join(__dirname, "..", "migrations", "0002_create_auth_tables.sql");

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const pool = createPgPool(databaseUrl);

  const [row] = (
    await pool.query<{ exists: boolean }>(
      `select exists (select from information_schema.tables where table_name = 'user') as exists`,
    )
  ).rows;

  if (row?.exists) {
    console.warn("skip 0002_create_auth_tables.sql (already applied)");
  } else {
    const sql = await readFile(authSchemaFile, "utf8");
    console.warn("applying 0002_create_auth_tables.sql");
    await pool.query(sql);
  }

  await pool.end();
  console.warn("auth schema up to date");
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
