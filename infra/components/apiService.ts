import * as path from "node:path";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

export interface ApiServiceArgs {
  appSecret: pulumi.Input<string>;
  authSecret: pulumi.Input<string>;
  databaseUrl: pulumi.Input<string>;
  dependsOn?: pulumi.Resource[];
  networkName: pulumi.Input<string>;
  port: pulumi.Input<number>;
  redisUrl: pulumi.Input<string>;
  webOrigin: pulumi.Input<string>;
}

const repoRoot = path.resolve(__dirname, "..", "..");
const INTERNAL_PORT = 3001;

export function createApiService(
  name: string,
  args: ApiServiceArgs
): docker.Container {
  const image = new docker.Image(`${name}-api-image`, {
    build: {
      context: repoRoot,
      dockerfile: path.join(repoRoot, "apps/api/Dockerfile"),
    },
    imageName: `${name}-api:local`,
  });

  return new docker.Container(
    `${name}-api`,
    {
      name: `${name}-api`,
      image: image.imageName,
      envs: [
        "NODE_ENV=production",
        `PORT=${INTERNAL_PORT}`,
        pulumi.interpolate`DATABASE_URL=${args.databaseUrl}`,
        pulumi.interpolate`REDIS_URL=${args.redisUrl}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.authSecret}`,
        pulumi.interpolate`APP_SECRET=${args.appSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=http://localhost:${args.port}`,
        pulumi.interpolate`WEB_ORIGIN=${args.webOrigin}`,
      ],
      ports: [{ internal: INTERNAL_PORT, external: args.port }],
      networksAdvanced: [{ name: args.networkName, aliases: ["api"] }],
      restart: "unless-stopped",
    },
    args.dependsOn ? { dependsOn: args.dependsOn } : undefined
  );
}
