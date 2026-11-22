import * as path from "node:path";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

export interface ApiServiceArgs {
  networkName: pulumi.Input<string>;
  port: pulumi.Input<number>;
  databaseUrl: pulumi.Input<string>;
  webOrigin: pulumi.Input<string>;
  authSecret: pulumi.Input<string>;
  dependsOn?: pulumi.Resource[];
}

const repoRoot = path.resolve(__dirname, "..", "..");

export function createApiService(name: string, args: ApiServiceArgs): docker.Container {
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
        pulumi.interpolate`PORT=${args.port}`,
        pulumi.interpolate`DATABASE_URL=${args.databaseUrl}`,
        pulumi.interpolate`BETTER_AUTH_SECRET=${args.authSecret}`,
        pulumi.interpolate`BETTER_AUTH_URL=http://localhost:${args.port}`,
        pulumi.interpolate`WEB_ORIGIN=${args.webOrigin}`,
      ],
      ports: [{ internal: 3001, external: args.port }],
      networksAdvanced: [{ name: args.networkName, aliases: ["api"] }],
      restart: "unless-stopped",
    },
    args.dependsOn ? { dependsOn: args.dependsOn } : undefined,
  );
}
