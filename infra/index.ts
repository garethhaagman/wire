import * as path from "node:path";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import { createApiService } from "./components/apiService";
import { createDocsService } from "./components/docsService";
import { createNetwork } from "./components/network";
import { createPostgres } from "./components/postgres";
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

const { connectionString } = createPostgres(name, {
  networkName: network.name,
  port: postgresPort,
  password: postgresPassword,
});

const migrate = new docker.Container(`${name}-migrate`, {
  name: `${name}-migrate`,
  image: new docker.Image(`${name}-migrate-image`, {
    build: {
      context: repoRoot,
      dockerfile: path.join(repoRoot, "apps/api/Dockerfile"),
      target: "build",
    },
    imageName: `${name}-migrate:local`,
  }).imageName,
  command: ["pnpm", "--filter", "@wire/db", "migrate"],
  envs: [pulumi.interpolate`DATABASE_URL=${connectionString}`],
  networksAdvanced: [{ name: network.name }],
  mustRun: false,
});

const api = createApiService(name, {
  networkName: network.name,
  port: apiPort,
  databaseUrl: connectionString,
  webOrigin,
  authSecret,
  dependsOn: [migrate],
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
