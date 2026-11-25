import * as path from "node:path";
import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

export interface WebServiceArgs {
  apiUrl: pulumi.Input<string>;
  dependsOn?: pulumi.Resource[];
  networkName: pulumi.Input<string>;
  port: pulumi.Input<number>;
}

const repoRoot = path.resolve(__dirname, "..", "..");

export function createWebService(
  name: string,
  args: WebServiceArgs
): docker.Container {
  const image = new docker.Image(`${name}-web-image`, {
    build: {
      context: repoRoot,
      dockerfile: path.join(repoRoot, "apps/web/Dockerfile"),
    },
    imageName: `${name}-web:local`,
  });

  return new docker.Container(
    `${name}-web`,
    {
      name: `${name}-web`,
      image: image.imageName,
      envs: [pulumi.interpolate`VITE_API_URL=${args.apiUrl}`],
      ports: [{ internal: 5173, external: args.port }],
      networksAdvanced: [{ name: args.networkName, aliases: ["web"] }],
      restart: "unless-stopped",
    },
    args.dependsOn ? { dependsOn: args.dependsOn } : undefined
  );
}
