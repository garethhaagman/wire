import "reflect-metadata";
import { DataSource } from "typeorm";
import { buildDataSourceOptions } from "./data-source.js";

// Entry point for the TypeORM CLI only (migration:generate/run/revert) — picks up
// DATABASE_URL directly since the CLI doesn't go through @wire/config's Nest-wired
// env parsing. Not imported by the running app; see index.ts.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the TypeORM CLI");
}

export default new DataSource(buildDataSourceOptions(databaseUrl));
