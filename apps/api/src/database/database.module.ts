import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { Database } from "@wire/db";
import type { ApiEnv } from "@wire/config";
import { API_ENV } from "../config/env.provider.js";

/**
 * One Database (primary pool + optional read replica) per process, shared by every
 * service and by Better Auth — see packages/db/src/database.ts.
 */
@Global()
@Module({
  providers: [
    {
      provide: Database,
      useFactory: (env: ApiEnv) =>
        new Database({
          url: env.DATABASE_URL,
          readUrl: env.DATABASE_READ_URL,
          poolMax: env.DATABASE_POOL_MAX,
          statementTimeoutMs: 15_000,
        }),
      inject: [API_ENV],
    },
  ],
  exports: [Database],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(Database) private readonly db: Database) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.close();
  }
}
