import { Global, Module } from "@nestjs/common";
import { createPgPool } from "@wire/db";
import { createAuth } from "./auth.config.js";
import { API_ENV } from "../config/env.provider.js";
import type { ApiEnv } from "@wire/config";

export const AUTH_INSTANCE = Symbol("AUTH_INSTANCE");

@Global()
@Module({
  providers: [
    {
      provide: AUTH_INSTANCE,
      useFactory: (env: ApiEnv) => createAuth(env, createPgPool(env.DATABASE_URL)),
      inject: [API_ENV],
    },
  ],
  exports: [AUTH_INSTANCE],
})
export class AuthModule {}
