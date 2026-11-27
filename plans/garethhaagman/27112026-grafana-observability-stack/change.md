# Local Grafana observability stack

**Date:** 27 November 2026
**Author:** garethhaagman
**Type:** architectural-decision

## Description of change

Wire gets an opt-in Docker profile for Grafana, Tempo, Loki, and Alloy.
Dashboard, datasource, and alert monitor config lives in `@wire/observability`, not a new app.
The Wire API overview shows RED charts from TraceQL metrics and opens as Grafana's home page.

## Implementation details

- `docker-compose.yml` profile `observability`: Alloy (OTLP :4317/:4318), Tempo, Loki, Grafana (:3003)
- `packages/observability/{alloy,tempo,loki,grafana}/` mounted read-only into those containers
- Grafana provisioning: datasources, Wire API overview (request rate, error rate/%, p50/p95/p99, by-endpoint breakdown, recent traces), alerting contact points / policy / paused error-span rule
- `GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH` points Home at the Wire API overview
- Tempo `query_frontend.metrics.max_duration: 24h` so chart ranges longer than the old 3h default work; `local_blocks` powers TraceQL metrics
- `make observability-up` / `observability-down`; `.env.example` documents `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
- Docs/skill: `packages/observability/README.md`, `internal-docs/api/observability.md`, api-design skill observability section

## Trade-offs

- **Chosen:** config in `@wire/observability` next to the SDK that emits the data, so monitors and dashboards version with the instrumentation contract.
- **Rejected:** a new `apps/grafana` or `packages/grafana` app. Grafana is a container image, not Wire application code.
- **Rejected:** putting only YAML under `infra/`. Pulumi/infra is for provisioning hosts; day-to-day dashboard/alert edits belong with the observability package.
- **Rejected:** `grafana/otel-lgtm` all-in-one image. Harder to mount our provisioning tree cleanly; multi-service compose matches the Garage profile pattern.
- **Chosen:** Grafana on `:3003` because markdown docs already bind `:3000`.
- **Chosen:** TraceQL metrics from Tempo local-blocks for RED charts (no Prometheus yet). Error % uses a Grafana expression because Tempo 2.7 rejects TraceQL arithmetic.
- **Rejected:** committing a local smoke-test script. Run ad-hoc traffic + Tempo search when verifying; keep the package free of one-off test harnesses.

## User input

User asked for Grafana after the OTEL work, clarified config location, UI, and commit scope:

> "lets d grafana - does this need to be a separate app or package ?"
> "if there is config for this monitors etc keep these in code in the observability package"
> "we dont need to commit the smoke test"
> "remove the how to use description. also add some useful charts like p99 etc"
> "can you put useful stuff on the homescreen"
> "commit and push also add to the changelog"
