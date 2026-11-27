import {
  type ApiEnv,
  requireEmailVerification,
  resolveAuthCookieDomain,
} from "@wire/config";
import type { Pool } from "@wire/db";
import { betterAuth } from "better-auth";
import type { Redis } from "ioredis";
import { selectEmailSender } from "../email/select-email-sender.js";

/**
 * Better Auth owns its own schema (packages/db/migrations/0002_create_auth_tables.sql)
 * and shares the app's primary pg Pool (see DatabaseModule) so connection count per
 * process stays bounded. With Redis available, sessions are also cached there
 * (`secondaryStorage`) so validating a session on every request doesn't hit
 * Postgres; `storeSessionInDatabase` keeps Postgres the source of truth.
 */
export function createAuth(env: ApiEnv, pool: Pool, redis?: Redis) {
  const sendEmail = selectEmailSender(env);
  const verifyEmail = requireEmailVerification(env);
  const cookieDomain = resolveAuthCookieDomain(env);

  return betterAuth({
    database: pool,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.WEB_ORIGIN],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: verifyEmail,
    },
    ...(verifyEmail
      ? {
          emailVerification: {
            sendOnSignUp: true,
            sendOnSignIn: true,
            autoSignInAfterVerification: true,
            sendVerificationEmail: ({
              user,
              url,
            }: {
              user: { email: string };
              url: string;
            }): Promise<void> => {
              // Fire-and-forget: awaiting would add a timing oracle on signup/signin.
              void sendEmail({
                to: user.email,
                subject: "Verify your email address",
                text: `Click the link to verify your email: ${url}`,
                html: `<p>Click the link to verify your email:</p><p><a href="${url}">${url}</a></p>`,
              });
              return Promise.resolve();
            },
          },
        }
      : {}),
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
            },
          }
        : {},
    ...(redis
      ? {
          // Reads and writes degrade to a cache miss / no-op when Redis is down, so
          // session checks fall through to Postgres. `delete` must not: a swallowed
          // delete would resurrect a revoked session from the cache once Redis returns.
          secondaryStorage: {
            get: (key: string) =>
              redis.get(`wire:auth:${key}`).catch(() => null),
            getAndDelete: (key: string) =>
              redis.getdel(`wire:auth:${key}`).catch(() => null),
            increment: async (key: string, ttl: number) => {
              try {
                const [[, count]] = (await redis
                  .multi()
                  .incr(`wire:auth:${key}`)
                  .expire(`wire:auth:${key}`, ttl, "NX")
                  .exec()) as [[Error | null, number], [Error | null, number]];
                return count;
              } catch {
                return 1;
              }
            },
            set: async (key: string, value: string, ttl?: number) => {
              const write = ttl
                ? redis.set(`wire:auth:${key}`, value, "EX", ttl)
                : redis.set(`wire:auth:${key}`, value);
              await write.catch(() => null);
            },
            delete: async (key: string) => {
              await redis.del(`wire:auth:${key}`);
            },
          },
        }
      : {}),
    session: {
      storeSessionInDatabase: true,
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,
      },
    },
    advanced: {
      ...(cookieDomain
        ? {
            crossSubDomainCookies: {
              enabled: true,
              domain: cookieDomain,
            },
          }
        : {}),
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
