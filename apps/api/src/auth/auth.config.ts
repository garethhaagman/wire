import { betterAuth } from "better-auth";
import type { Pool } from "@wire/db";
import type { ApiEnv } from "@wire/config";

/**
 * Better Auth owns its own schema (packages/db/migrations/0002_create_auth_tables.sql) and
 * its own pg Pool, created via @wire/db's createPgPool — keeps `pg` a single-owned
 * dependency in the workspace rather than duplicated across apps/api and packages/db.
 */
export function createAuth(env: ApiEnv, pool: Pool) {
  return betterAuth({
    database: pool,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
