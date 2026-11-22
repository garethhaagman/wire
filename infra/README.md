# Wire infra (Pulumi)

Provisions the same four containers as `docker-compose.yml` (postgres, api, web, docs) via Pulumi's `docker` provider, per [internal-docs/stack/infra-pulumi.md](../internal-docs/stack/infra-pulumi.md). Use this instead of `make up` when you want changes tracked as infrastructure-as-code (diffs, history, multi-environment config) rather than ad hoc `docker compose up`.

## Local use

```sh
cd infra
pulumi login --local   # file-based state for local dev; see state backend note below
pulumi stack init dev
pulumi up
```

Config lives in `Pulumi.dev.yaml`. Secrets (`postgresPassword`, `authSecret`) are **not** set there — set them explicitly so they're encrypted in state:

```sh
pulumi config set --secret wire:postgresPassword <value>
pulumi config set --secret wire:authSecret <value>
```

Without setting them, dev-only insecure defaults are used (see `index.ts`) — fine for a laptop, never for anything shared.

## State backend

Per [internal-docs/stack/infra-pulumi.md](../internal-docs/stack/infra-pulumi.md), production use should point `pulumi login` at self-hosted state (Postgres or a self-hosted S3-compatible bucket), not Pulumi Cloud — keeps the "no managed services" commitment end-to-end. `pulumi login --local` (file-based, `.pulumi/` on disk) is fine for a single developer's own iteration and is what's used by default here; it is not a substitute for a shared backend once more than one person touches a stack.

## Relationship to docker-compose.yml / Makefile

These are two paths to the same containers, not two different stacks — `make up` is the fast local loop, `pulumi up` here is the IaC-tracked path intended for anything beyond a single laptop (staging, a self-hosted customer's production deployment). Both build from the same `apps/*/Dockerfile`s.
