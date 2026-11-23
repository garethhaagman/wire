import { z } from "zod";

/** Blank `KEY=` lines in .env files mean "unset", not an empty value. */
const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());

export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
    /** Optional streaming replica for history/search/list reads. */
    DATABASE_READ_URL: optionalString.pipe(z.string().url().optional()),
    /** Connections per pool per process — size against PgBouncer/max_connections across all replicas. */
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
    REDIS_URL: z.string().url().default("redis://localhost:6379"),
    /**
     * Run the outbox relay, webhook delivery worker, and retention jobs in this
     * process. Set false on pure API/realtime replicas once a dedicated worker
     * deployment exists; any number of processes may run them concurrently.
     */
    RUN_WORKERS: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(1000),
    /**
     * Pending invites are claimed by email on first sign-in. Requiring a verified
     * email stops someone signing up with an invitee's address to take their seat.
     * Defaults to true in production.
     */
    MEMBER_CLAIM_REQUIRE_VERIFIED_EMAIL: z.enum(["true", "false"]).optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    WEB_ORIGIN: z.string().url(),
    /** Google OAuth client — "Sign in with Google" is enabled only when both are set. */
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    /** Agent harness LLM backend. Unset means agent runs use the deterministic mock harness. */
    ANTHROPIC_API_KEY: optionalString,
    /**
     * File blob storage. Unset S3_BUCKET means files are stored on local disk
     * (LocalDiskAdapter) — zero config, nothing external to run. Set S3_BUCKET (+
     * region/creds) to use S3Adapter instead; S3_ENDPOINT + S3_FORCE_PATH_STYLE
     * point the same adapter at a local Garage instance instead of real AWS.
     */
    S3_BUCKET: optionalString,
    S3_REGION: optionalString,
    S3_ENDPOINT: optionalString.pipe(z.string().url().optional()),
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
    /** Local-disk upload/download URLs are signed with this; defaults to BETTER_AUTH_SECRET so no new secret is needed. */
    LOCAL_UPLOAD_DIR: optionalString,
    /** Outbound email (invites, etc). Unset means emails are logged via console, not delivered. */
    RESEND_API_KEY: optionalString,
    EMAIL_FROM_ADDRESS: z.string().min(1).default("Wire <no-reply@wire.local>"),
  })
  .refine((env) => Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET), {
    message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
    path: ["GOOGLE_CLIENT_SECRET"],
  })
  .refine((env) => !env.S3_BUCKET || (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_REGION), {
    message: "S3_BUCKET requires S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY",
    path: ["S3_BUCKET"],
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function claimRequiresVerifiedEmail(env: ApiEnv): boolean {
  return env.MEMBER_CLAIM_REQUIRE_VERIFIED_EMAIL
    ? env.MEMBER_CLAIM_REQUIRE_VERIFIED_EMAIL === "true"
    : env.NODE_ENV === "production";
}

export function parseApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = apiEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid API environment:\n${result.error.toString()}`);
  }
  return result.data;
}
