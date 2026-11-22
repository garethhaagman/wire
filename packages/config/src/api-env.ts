import { z } from "zod";

/** Blank `KEY=` lines in .env files mean "unset", not an empty value. */
const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().min(1).optional());

export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    WEB_ORIGIN: z.string().url(),
    /** Google OAuth client — "Sign in with Google" is enabled only when both are set. */
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
  })
  .refine((env) => Boolean(env.GOOGLE_CLIENT_ID) === Boolean(env.GOOGLE_CLIENT_SECRET), {
    message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together",
    path: ["GOOGLE_CLIENT_SECRET"],
  });

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function parseApiEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const result = apiEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid API environment:\n${result.error.toString()}`);
  }
  return result.data;
}
