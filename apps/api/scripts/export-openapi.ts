/**
 * Boots the Nest app (requires a reachable Postgres — `make db migrate` locally), generates the OpenAPI document from @nestjs/swagger decorators, writes it
 * to internal-docs/api/openapi.yaml, then exits. The committed file is a generated artifact —
 * never hand-edit it; change the controllers/DTOs and re-run this script instead.
 *
 * Usage: DATABASE_URL=... bun run openapi:export
 */
import "reflect-metadata";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { stringify } from "yaml";
import { createApp } from "../src/create-app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "internal-docs",
  "api",
  "openapi.yaml"
);

async function main(): Promise<void> {
  const app = await createApp();

  const config = new DocumentBuilder()
    .setTitle("Wire API")
    .setDescription(
      "Primary HTTP surface for the Wire AI-native team messaging platform. Generated from " +
        "@nestjs/swagger decorators in apps/api, do not hand-edit. Regenerate with `bun run openapi:export`."
    )
    .setVersion("0.1.0")
    .addCookieAuth("better-auth.session_token")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const yaml = stringify(document, { lineWidth: 100 });

  await writeFile(OUTPUT_PATH, yaml, "utf8");
  console.warn(`wrote ${OUTPUT_PATH}`);

  await app.close();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
