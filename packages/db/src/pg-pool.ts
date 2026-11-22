import { Pool } from "pg";

/**
 * Single owner of the `pg` driver dependency in the workspace — both apps/api (Better
 * Auth's Pool) and migrate-auth.ts (raw Better Auth schema apply) go through this
 * instead of each declaring their own `pg` dependency, which previously caused a Bun
 * peer-dependency resolution hash mismatch between install contexts in Docker.
 */
export function createPgPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

export type { Pool } from "pg";
