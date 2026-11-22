import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { buildDataSourceOptions } from "@wire/db";
import type { ApiEnv } from "@wire/config";
import { API_ENV } from "../config/env.provider.js";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (env: ApiEnv) => buildDataSourceOptions(env.DATABASE_URL),
      inject: [API_ENV],
    }),
  ],
})
export class DatabaseModule {}
