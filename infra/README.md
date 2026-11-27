# Wire infra (Pulumi)

Provisions the same containers as `docker-compose.yml` (postgres, redis, a one-shot migrate job, api, web, docs) via Pulumi's `docker` provider. Full design: [internal-docs/stack/infra-pulumi.md](../internal-docs/stack/infra-pulumi.md).

Use this instead of `make docker-up` when you want changes tracked as infrastructure-as-code: diffs, history, and multi-environment config, rather than ad hoc `docker compose up`.

## Local use

```sh
cd infra
pulumi login --local   # file-based state for local dev, see "State backend" below
pulumi stack init dev
pulumi up
```

### Secrets

Config lives in `Pulumi.dev.yaml`. Secrets (`postgresPassword`, `authSecret`, `appSecret`) are **not** set there. Set them explicitly so they're encrypted in state:

```sh
pulumi config set --secret wire:postgresPassword <value>
pulumi config set --secret wire:authSecret <value>
pulumi config set --secret wire:appSecret <value>
```

Without setting them, dev-only insecure defaults are used (see `index.ts`). That's fine for a laptop, never for anything shared.

## State backend

| Backend                                                            | When to use it                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pulumi login --local` (file-based)                                | A single developer's own iteration; this is the default here.                                                                                                                                     |
| Self-hosted state (Postgres or a self-hosted S3-compatible bucket) | Production, or anything shared by more than one person. Keeps the "no managed services" commitment end-to-end; see [internal-docs/stack/infra-pulumi.md](../internal-docs/stack/infra-pulumi.md). |

Pulumi Cloud is not used for either case.

## Relationship to docker-compose.yml / Makefile

These are two paths to the same containers, not two different stacks. Both build from the same `apps/*/Dockerfile`s.

| Path               | Best for                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `make docker-up`   | The fast local loop.                                                                                                  |
| `pulumi up` (here) | The IaC-tracked path for anything beyond a single laptop: staging, or a self-hosted customer's production deployment. |
