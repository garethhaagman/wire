# Infrastructure: Pulumi (TypeScript)

## Why Pulumi over Terraform/CloudFormation

Infrastructure is defined in the same language and monorepo as the application (`infra/` is a TypeScript package, can import `@wire/config` for shared env schemas, and is type-checked by the same `tsc -b` graph). No HCL, no separate state-of-mind switch for the team. Pulumi state itself is self-hosted (see below) rather than Pulumi Cloud, consistent with the no-managed-services stance.

## Pulumi project layout

```text
infra/
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── Pulumi.staging.yaml
├── Pulumi.prod.yaml
├── index.ts              # stack entrypoint, composes components below
├── components/
│   ├── network.ts         # VPC/subnets or bare-metal network config
│   ├── postgres.ts         # Postgres instance(s) + backup sidecar
│   ├── redis.ts            # cache + pub/sub, no persistence
│   ├── objectStore.ts       # self-hosted S3-compatible (MinIO/Garage) cluster
│   ├── queue.ts              # Postgres-backed job table setup, or NATS if promoted
│   ├── apiService.ts          # container + reverse proxy + TLS termination
│   ├── workerService.ts        # container, horizontally scalable
│   └── mcpService.ts            # container
└── package.json
```

This is the target layout. Built so far: `network.ts`, `postgres.ts`, `redis.ts` (no volume, reconstructible state only, see [self-hosting.md](./self-hosting.md)), `apiService.ts`, `webService.ts` and `docsService.ts`, plus a one-shot migrate container in `index.ts`. Postgres and Redis have healthchecks and are waited on; the api starts only after migrations exit. Not yet built: `objectStore.ts`, `queue.ts` (the queue is just Postgres tables, created by migrations), `workerService.ts`, `mcpService.ts`.

## State backend

Pulumi state stored in the **self-hosted Postgres instance** (`pulumi login postgres://...`) or a self-hosted object-store backend (`pulumi login s3://...` pointed at the self-hosted MinIO/Garage endpoint), never Pulumi Cloud's managed state, to keep the "no managed services" commitment end-to-end, including for the infra tooling itself.

## Deployment target

Default target is **Docker Compose for single-node / small deployments**, with a **Pulumi Kubernetes provider path** for customers who need multi-node scaling or already run k8s. Both consume the _same_ container images: Pulumi's job is provisioning compute, networking, secrets, and the Postgres/object-store/queue substrate, then handing container specs to whichever runtime (`docker compose` or a k8s `Deployment`) the target stack selects. Concretely:

- `components/apiService.ts` etc. take a `runtime: "compose" | "kubernetes"` stack config and branch internally: same image reference, same env contract, different orchestration resource.
- Start every new customer on `compose` unless they explicitly need k8s (multi-node HA, existing k8s platform team). This matches the "simplicity first" bias for an early-stage self-hosted product; don't make every customer operate a control plane to run three containers.

## Environments

`Pulumi.dev.yaml` / `.staging.yaml` / `.prod.yaml` hold stack-specific config (resource sizing, replica counts, domain names); secrets (DB passwords, harness provider API keys for first-party testing, TLS cert material) go through Pulumi's native secret encryption backed by a self-hosted KMS-equivalent (e.g. `age` or a self-hosted Vault) referenced via `Pulumi.<stack>.yaml`'s `secretsProvider`, not a cloud KMS.

## CI/CD

`pulumi preview` on every PR touching `infra/`, posted as a check; `pulumi up` on merge to `main` for `staging`, manual approval gate for `prod`. This lives in the same CI pipeline as the monorepo's `turbo run build test` (see [monorepo-layout.md](./monorepo-layout.md)): infra and app changes are reviewed together when they're coupled (e.g. a new env var requiring both a `@wire/config` schema change and a Pulumi secret).

## Multi-tenancy note

For the hosted-by-Wire offering (if one exists alongside self-hosted, see [pricing/packaging.md](../pricing/packaging.md)), each workspace is a row, not a separate stack: Pulumi provisions the _platform_, not per-customer infrastructure. Self-hosting customers get their own full Pulumi stack per [self-hosting.md](./self-hosting.md). Don't conflate the two deployment models when sizing `infra/` components.
