import { z } from "zod";

/** Blank `KEY=` lines in .env files mean "unset", not an empty value. */
const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional()
);

/** Password sign-in/up requires a verified email in production. */
export function requireEmailVerification(env: {
  NODE_ENV: "development" | "test" | "production";
}): boolean {
  return env.NODE_ENV === "production";
}

/**
 * Two-label parent when both hosts share one (api.example.com + app.example.com →
 * example.com). Null when hostnames match (host-only cookies) or sites differ.
 */
export function sharedRegistrableDomain(
  webOrigin: string,
  authUrl: string
): string | null {
  const webHost = new URL(webOrigin).hostname;
  const apiHost = new URL(authUrl).hostname;
  if (webHost === apiHost) {
    return null;
  }
  const webParts = webHost.split(".");
  const apiParts = apiHost.split(".");
  if (webParts.length < 2 || apiParts.length < 2) {
    return null;
  }
  const webRoot = webParts.slice(-2).join(".");
  const apiRoot = apiParts.slice(-2).join(".");
  if (webRoot !== apiRoot) {
    return null;
  }
  return webRoot;
}

interface AuthOriginEnv {
  AUTH_COOKIE_DOMAIN?: string | undefined;
  BETTER_AUTH_URL: string;
  NODE_ENV: "development" | "test" | "production";
  WEB_ORIGIN: string;
}

/**
 * Shared parent domain for cross-subdomain session cookies, or null when
 * host-only cookies are enough (same hostname) / origins are cross-site.
 */
export function resolveAuthCookieDomain(env: AuthOriginEnv): string | null {
  if (env.AUTH_COOKIE_DOMAIN) {
    return env.AUTH_COOKIE_DOMAIN;
  }
  return sharedRegistrableDomain(env.WEB_ORIGIN, env.BETTER_AUTH_URL);
}

/**
 * Production guard: session cookies must stay first-party. Sibling subdomains
 * under one parent are fine; fully distinct sites need a reverse proxy (or an
 * explicit AUTH_COOKIE_DOMAIN only helps when they already share a parent).
 */
export function assertAuthCookieOriginsCompatible(env: AuthOriginEnv): void {
  const webHost = new URL(env.WEB_ORIGIN).hostname;
  const apiHost = new URL(env.BETTER_AUTH_URL).hostname;
  if (webHost === apiHost) {
    return;
  }
  if (resolveAuthCookieDomain(env)) {
    return;
  }
  throw new Error(
    "WEB_ORIGIN and BETTER_AUTH_URL are on different sites. Use a shared parent domain (app.example.com + api.example.com) and set AUTH_COOKIE_DOMAIN to that parent, or reverse-proxy the API under the web origin so cookies stay first-party."
  );
}

export const apiEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
    /** Optional streaming replica for history/search/list reads. */
    DATABASE_READ_URL: optionalString.pipe(z.string().url().optional()),
    /** Connections per pool per process; size against PgBouncer/max_connections across all replicas. */
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
    /**
     * Root secret for app crypto (webhook seal, local-upload HMAC). Kept separate
     * from BETTER_AUTH_SECRET so a leak in one subsystem doesn't mint sessions.
     * Required in production; falls back to BETTER_AUTH_SECRET in development/test.
     */
    APP_SECRET: optionalString.pipe(z.string().min(32).optional()),
    BETTER_AUTH_URL: z.string().url(),
    WEB_ORIGIN: z.string().url(),
    /**
     * Cookie `Domain` for Better Auth when the web app and API share a parent
     * (e.g. `example.com` for app.example.com + api.example.com). Auto-derived
     * when unset and the two URLs share a two-label parent; set explicitly for
     * multi-part public suffixes (example.co.uk).
     */
    AUTH_COOKIE_DOMAIN: optionalString,
    /** Google OAuth client. "Sign in with Google" is enabled only when both are set. */
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    /** Agent harness LLM backend. Unset means agent runs use the deterministic mock harness. */
    ANTHROPIC_API_KEY: optionalString,
    /**
     * File blob storage. Unset S3_BUCKET means files are stored on local disk
     * (LocalDiskAdapter): zero config, nothing external to run. Set S3_BUCKET (+
     * region/creds) to use S3Adapter instead; S3_ENDPOINT + S3_FORCE_PATH_STYLE
     * point the same adapter at a local Garage instance instead of real AWS.
     */
    S3_BUCKET: optionalString,
    S3_REGION: optionalString,
    S3_ENDPOINT: optionalString.pipe(z.string().url().optional()),
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
    /** Local-disk upload root when S3_BUCKET is unset. */
    LOCAL_UPLOAD_DIR: optionalString,
    /** Outbound email (invites, verification). Unset means emails are logged via console, not delivered. */
    RESEND_API_KEY: optionalString,
    EMAIL_FROM_ADDRESS: z.string().min(1).default("Wire <no-reply@wire.local>"),
    /**
     * Pino log level. Default `info` so turbo shows one access line per request
     * without drowning in Nest framework debug noise.
     */
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    /**
     * OpenTelemetry service name. Defaults to `wire-api`.
     * Standard OTEL env; we also accept it via parseApiEnv for typed access.
     */
    OTEL_SERVICE_NAME: z.string().min(1).default("wire-api"),
    /**
     * OTLP HTTP collector base URL (e.g. `http://localhost:4318`). When unset,
     * auto-instrumentation still runs but spans are not exported.
     */
    OTEL_EXPORTER_OTLP_ENDPOINT: optionalString.pipe(
      z.string().url().optional()
    ),
    /**
     * Set `true` to skip starting the OpenTelemetry SDK entirely.
     * Mirrors the OTEL spec's OTEL_SDK_DISABLED.
     */
    OTEL_SDK_DISABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
  })
  .refine(
    (env) =>
      Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET),
    {
      message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
      path: ["GOOGLE_CLIENT_SECRET"],
    }
  )
  .refine(
    (env) =>
      !env.S3_BUCKET ||
      (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_REGION),
    {
      message:
        "S3_BUCKET requires S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY",
      path: ["S3_BUCKET"],
    }
  )
  .refine((env) => env.NODE_ENV !== "production" || Boolean(env.APP_SECRET), {
    message: "APP_SECRET is required in production (min 32 chars)",
    path: ["APP_SECRET"],
  })
  .refine(
    (env) =>
      env.NODE_ENV !== "production" ||
      !requireEmailVerification(env) ||
      Boolean(env.RESEND_API_KEY),
    {
      message:
        "RESEND_API_KEY is required in production when email verification is enabled",
      path: ["RESEND_API_KEY"],
    }
  )
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") {
      return;
    }
    try {
      assertAuthCookieOriginsCompatible(env);
    } catch (err) {
      ctx.addIssue({
        code: "custom",
        message: err instanceof Error ? err.message : String(err),
        path: ["AUTH_COOKIE_DOMAIN"],
      });
    }
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function claimRequiresVerifiedEmail(env: ApiEnv): boolean {
  return env.MEMBER_CLAIM_REQUIRE_VERIFIED_EMAIL
    ? env.MEMBER_CLAIM_REQUIRE_VERIFIED_EMAIL === "true"
    : env.NODE_ENV === "production";
}

/**
 * App crypto root (webhooks, local-upload HMAC). Never falls back to the auth
 * secret in production; parseApiEnv already requires APP_SECRET there.
 */
export function resolveAppSecret(env: ApiEnv): string {
  return env.APP_SECRET ?? env.BETTER_AUTH_SECRET;
}

export function parseApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = apiEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid API environment:\n${result.error.toString()}`);
  }
  return result.data;
}
