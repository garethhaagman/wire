import { Global, Module } from "@nestjs/common";
import { Database } from "@wire/db";
import type { Redis } from "ioredis";
import { createAuth } from "./auth.config.js";
import { API_ENV } from "../config/env.provider.js";
import { REDIS } from "../redis/redis.module.js";
import type { ApiEnv } from "@wire/config";

export const AUTH_INSTANCE = Symbol("AUTH_INSTANCE");

@Global()
@Module({
  providers: [
    {
      provide: AUTH_INSTANCE,
      useFactory: (env: ApiEnv, db: Database, redis: Redis) => createAuth(env, db.primary, redis),
      inject: [API_ENV, Database, REDIS],
    },
  ],
  exports: [AUTH_INSTANCE],
})
export class AuthModule {}
