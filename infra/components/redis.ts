import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";

export interface RedisArgs {
  networkName: pulumi.Input<string>;
}

export interface RedisResult {
  container: docker.Container;
  url: pulumi.Output<string>;
}

/**
 * Self-hosted Redis — session cache, rate limits, idempotency keys, presence,
 * membership cache and realtime pub/sub (internal-docs/data-model/scaling.md).
 * Everything in it is reconstructible from Postgres, so persistence is off and
 * there's no volume. `noeviction` because idempotency/rate-limit keys silently
 * disappearing under memory pressure is worse than a write error the API already
 * fails open on. Not published to the host: only the api reaches it.
 */
export function createRedis(name: string, args: RedisArgs): RedisResult {
  const container = new docker.Container(`${name}-redis`, {
    name: `${name}-redis`,
    image: "redis:7-alpine",
    command: ["redis-server", "--save", "", "--appendonly", "no", "--maxmemory-policy", "noeviction"],
    networksAdvanced: [{ name: args.networkName, aliases: ["redis"] }],
    healthcheck: {
      tests: ["CMD", "redis-cli", "ping"],
      interval: "5s",
      timeout: "5s",
      retries: 10,
    },
    wait: true,
    restart: "unless-stopped",
  });

  return { container, url: pulumi.output("redis://redis:6379") };
}
