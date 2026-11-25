# Self-hosting

## What "no managed services" actually commits to

| Concern                         | Managed-service default (rejected) | Wire's self-hosted substitute                                                                                                  |
| ------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Relational + vector + search DB | RDS/Cloud SQL + Pinecone/Weaviate  | Single **Postgres** container (`pgvector` + `tsvector`), [architecture.md](./architecture.md)                                  |
| Object storage                  | S3/GCS                             | **MinIO** or **Garage** (S3-compatible)                                                                                        |
| Queue                           | SQS/Managed Kafka/Cloud Tasks      | Postgres-backed job table, promotable to **NATS**                                                                              |
| Cache / pub/sub                 | ElastiCache/Memorystore            | Single **Redis** container — reconstructible state only, no persistence or backups required                                    |
| TLS/certs                       | ACM                                | **Caddy** or cert-manager + self-hosted ACME (Let's Encrypt is fine — it's a protocol, not a managed compute service)          |
| Secrets                         | Cloud KMS/Secrets Manager          | **age**-encrypted Pulumi secrets or self-hosted **Vault**                                                                      |
| Observability                   | Datadog/Cloud-native APM           | Self-hosted **Grafana + Loki + Tempo** (or just structured JSON logs + Postgres-queryable traces for the smallest deployments) |

This is a real operational commitment: Wire (the company) or the self-hosting customer now owns backup verification, Postgres major-version upgrades, and incident response for all of the above. That's the trade being made for zero cloud-vendor dependency and a credible on-prem/VPC story — see [architecture.md](./architecture.md) for why that trade matters for the target buyer.

## Minimum viable operator footprint

For the default Compose target (per [infra-pulumi.md](./infra-pulumi.md)):

- 1 host for `api` + `mcp-server` + reverse proxy. Today the outbox relay and webhook delivery run inside `api` (`RUN_WORKERS=true`, the default); in larger deployments set it to `false` on request-serving replicas and run a few dedicated worker replicas instead.
- 1 host (or same host, smaller deployments) for `postgres` with a persistent volume and a scheduled `pg_dump` (or `pgBackRest`) to the object store.
- `redis` alongside `api` — small, no volume needed. If it's lost the API keeps serving (rate limiting and caches fail open; sessions fall back to Postgres) and realtime resumes when it returns.
- 1 host for `worker` (once it exists), scaled horizontally by running more containers against the same Postgres-backed queue.
- 1 object-store node (MinIO single-node is fine below a certain scale; cluster mode for HA).

Three to four hosts total for a production-credible small deployment. This should be explicit in sales/demo material — it is a real differentiator against "you need a whole platform team" framings of self-hosting, see [gtm/distribution-channels.md](../gtm/distribution-channels.md).

## Backup and restore

- Postgres: continuous WAL archiving to object store + daily base backup; restore drilled in CI against a throwaway Pulumi stack (`pulumi stack init restore-test`) on a schedule, not just documented.
- Object store: versioning enabled; cross-node replication for MinIO clusters.
- **Import zips are the highest-sensitivity artifact on disk** (per [import/workspace-import.md](../import/workspace-import.md): "treat uploads as confidential") — encrypt at rest at the object-store layer, enforce the TTL delete after successful ingest in the backup retention policy too, not just the primary store.

## Upgrades

Container images are tagged with the same calendar/semver scheme as the API (see [api/versioning.md](../api/versioning.md)). `pulumi up` with a new image tag is the upgrade path; Postgres migrations run as a pre-deploy job (`packages/db/migrations`) with a documented rollback script per migration — no forward-only migrations without a tested down-path, because self-hosted operators cannot call a vendor to recover a bad migration.

## Air-gapped / offline installs

Enterprise self-hosters frequently need an offline install path (no pulling images from a public registry at deploy time). Ship a bundled image tarball + Pulumi config profile (`Pulumi.airgap.yaml`) as a documented variant once there's a first enterprise self-host customer requesting it — don't build this speculatively before someone needs it.
