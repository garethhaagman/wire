import * as docker from "@pulumi/docker";

/**
 * Single bridge network so compose-equivalent service-name DNS resolution works
 * (e.g. the api container reaches Postgres at "postgres:5432") without exposing
 * every service to the host by default. Mirrors internal-docs/stack/architecture.md.
 */
export function createNetwork(name: string): docker.Network {
  return new docker.Network(`${name}-network`, {
    name: `${name}-network`,
  });
}
