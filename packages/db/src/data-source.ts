import type { DataSourceOptions } from "typeorm";
import { WorkspaceEntity } from "./entities/workspace.entity.js";

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: "postgres",
    url: databaseUrl,
    entities: [WorkspaceEntity],
    migrations: [new URL("migrations/*.ts", import.meta.url).pathname],
    synchronize: false,
    logging: false,
  };
}
