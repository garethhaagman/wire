# Observability

Shared logging and tracing for Wire, plus the local Grafana stack config
(datasources, dashboards, and alert monitors).

## What this covers

- Leveled request and domain logs (visible in the local turbo output)
- OpenTelemetry traces for every API request
- Versioned Grafana / Tempo / Loki / Alloy config for local interpretation

Full API conventions live in the internal observability doc.

## Local Grafana stack

Start it with:

```sh
make observability-up
```

Then point the API’s OTLP endpoint at `http://localhost:4318` and open Grafana at
[http://localhost:3003](http://localhost:3003) (anonymous admin). Home is the Wire API
overview; Explore → Tempo is the free-form trace search.

Compose mounts the config from this package. Edit files here; do not treat the
Grafana UI as the source of truth.

| Area                | Purpose                                                      |
| ------------------- | ------------------------------------------------------------ |
| Alloy               | OTLP intake on ports 4317 / 4318, forwards to Tempo and Loki |
| Tempo               | Trace store                                                  |
| Loki                | Log store (API access logs still go to stdout for turbo)     |
| Grafana datasources | Tempo and Loki wired for Explore                             |
| Grafana dashboards  | Provisioned Wire overview                                    |
| Grafana alerting    | Contact points, policies, and monitors                       |

To change a monitor, edit the alerting provisioning under `grafana/`, then
recreate the Grafana container so it reloads.
