import * as path from "node:path";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import { createApiService } from "./components/apiService";
import { createDocsService } from "./components/docsService";
import { createNetwork } from "./components/network";
import { createPostgres } from "./components/postgres";
import { createRedis } from "./components/redis";
import { createWebService } from "./components/webService";

const repoRoot = path.resolve(__dirname, "..");

const config = new pulumi.Config("wire");
const stackName = pulumi.getStack();
const name = `wire-${stackName}`;

const webOrigin = config.require("webOrigin");
const apiPort = config.requireNumber("apiPort");
const webPort = config.requireNumber("webPort");
const docsPort = config.requireNumber("docsPort");
const postgresPort = config.requireNumber("postgresPort");

// Dev-only default; production stacks must set wire:postgresPassword / wire:authSecret
// as Pulumi secrets (`pulumi config set --secret`), never commit real values here.
const postgresPassword = config.getSecret("postgresPassword") ?? pulumi.secret("wire_dev_password");
const authSecret =
  config.getSecret("authSecret") ?? pulumi.secret("dev-only-secret-change-me-32chars-min");

const network = createNetwork(name);

const postgres = createPostgres(name, {
  networkName: network.name,
  port: postgresPort,
  password: postgresPassword,
});

const redis = createRedis(name, { networkName: network.name });

// `attach` blocks until the container exits, so the api only starts once
// migrations have finished; `mustRun: false` because it exits by design.
const migrate = new docker.Container(
  `${name}-migrate`,
  {
    name: `${name}-migrate`,
    image: new docker.Image(`${name}-migrate-image`, {
      build: {
        context: repoRoot,
        dockerfile: path.join(repoRoot, "apps/api/Dockerfile"),
        target: "build",
      },
      imageName: `${name}-migrate:local`,
    }).imageName,
    workingDir: "/repo/packages/db",
    command: ["bun", "run", "migrate"],
    envs: [pulumi.interpolate`DATABASE_URL=${postgres.connectionString}`],
    networksAdvanced: [{ name: network.name }],
    attach: true,
    logs: true,
    mustRun: false,
  },
  { dependsOn: [postgres.container] },
);

const api = createApiService(name, {
  networkName: network.name,
  port: apiPort,
  databaseUrl: postgres.connectionString,
  redisUrl: redis.url,
  webOrigin,
  authSecret,
  dependsOn: [migrate, redis.container],
});

const web = createWebService(name, {
  networkName: network.name,
  port: webPort,
  apiUrl: pulumi.interpolate`http://localhost:${apiPort}`,
  dependsOn: [api],
});

const docs = createDocsService(name, {
  networkName: network.name,
  port: docsPort,
});

export const apiUrl = pulumi.interpolate`http://localhost:${apiPort}`;
export const webUrl = pulumi.interpolate`http://localhost:${webPort}`;
export const docsUrl = pulumi.interpolate`http://localhost:${docsPort}`;
export const apiContainerName = api.name;
export const webContainerName = web.name;
export const docsContainerName = docs.name;
