/**
 * Standalone Better Auth config for `@better-auth/cli generate` only.
 * Not imported by the running app — src/auth/auth.config.ts (Nest-DI-wired, real env/pool)
 * is the source of truth for runtime behavior. Keep the two in sync whenever auth options
 * change (plugins, fields, etc.) since this is only used to (re)generate
 * packages/db/migrations/0002_create_auth_tables.sql.
 */
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: "postgres://wire:wire_dev_password@localhost:55432/wire",
  }),
  secret: "cli-only-placeholder",
  emailAndPassword: {
    enabled: true,
  },
});
