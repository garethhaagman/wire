import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

export interface PostgresArgs {
  networkName: pulumi.Input<string>;
  password: pulumi.Input<string>;
  port: pulumi.Input<number>;
}

export interface PostgresResult {
  connectionString: pulumi.Output<string>;
  container: docker.Container;
}

/**
 * Self-hosted Postgres — see internal-docs/stack/self-hosting.md: this is the one
 * durable stateful system in the v1 topology (relational + pgvector + FTS, per
 * internal-docs/stack/architecture.md). No managed RDS/Cloud SQL equivalent.
 */
export function createPostgres(
  name: string,
  args: PostgresArgs
): PostgresResult {
  const volume = new docker.Volume(`${name}-postgres-data`, {
    name: `${name}-postgres-data`,
  });

  const container = new docker.Container(`${name}-postgres`, {
    name: `${name}-postgres`,
    image: "postgres:16-alpine",
    envs: [
      "POSTGRES_USER=wire",
      pulumi.interpolate`POSTGRES_PASSWORD=${args.password}`,
      "POSTGRES_DB=wire",
    ],
    ports: [{ internal: 5432, external: args.port }],
    volumes: [
      { volumeName: volume.name, containerPath: "/var/lib/postgresql/data" },
    ],
    networksAdvanced: [{ name: args.networkName, aliases: ["postgres"] }],
    healthcheck: {
      tests: ["CMD-SHELL", "pg_isready -U wire -d wire"],
      interval: "5s",
      timeout: "5s",
      retries: 10,
    },
    wait: true,
    restart: "unless-stopped",
  });

  const connectionString = pulumi.interpolate`postgres://wire:${args.password}@postgres:5432/wire`;

  return { container, connectionString };
}
