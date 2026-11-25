import * as path from "node:path";
import * as docker from "@pulumi/docker";
import type * as pulumi from "@pulumi/pulumi";

export interface DocsServiceArgs {
  networkName: pulumi.Input<string>;
  port: pulumi.Input<number>;
}

const repoRoot = path.resolve(__dirname, "..", "..");

export function createDocsService(
  name: string,
  args: DocsServiceArgs
): docker.Container {
  const image = new docker.Image(`${name}-docs-image`, {
    build: {
      context: repoRoot,
      dockerfile: path.join(repoRoot, "apps/docs/Dockerfile"),
    },
    imageName: `${name}-docs:local`,
  });

  return new docker.Container(`${name}-docs`, {
    name: `${name}-docs`,
    image: image.imageName,
    ports: [{ internal: 3000, external: args.port }],
    networksAdvanced: [{ name: args.networkName, aliases: ["docs"] }],
    restart: "unless-stopped",
  });
}
