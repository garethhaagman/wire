# Versioning, experimental endpoints, and deprecation

## Major versioning

Use URL-based major versioning:

```http
https://api.wire.example/v1/workspaces
https://api.wire.example/v2/workspaces
```

| Change | Version impact |
|--------|-----------------|
| Add endpoint | None — always safe |
| Add optional request field | None — always safe |
| Add response field | None — clients must tolerate unknown fields |
| Fix backward-compatible bug | None |
| Remove or rename a field | **Major** |
| Change a field's type | **Major** |
| Change which fields are required | **Major** |
| Change response structure | **Major** |

- Major versions represent breaking changes; minor/patch-equivalent changes stay backward-compatible within a major version.
- Never silently change existing endpoint behavior.
- Support multiple major versions simultaneously during a deprecation window.
- Publish deprecation and sunset dates; maintain a changelog for every release.
- Clients must tolerate unknown response fields — this is what makes additive changes free.

Version the API **contract**, not individual endpoints — all `/v1` endpoints move together.

## Experimental and beta endpoints

New functionality ships without committing to a permanent contract:

| Stage | Convention | Stability |
|-------|-----------|-----------|
| Stable | `/v1/workspaces` | Guaranteed contract |
| Beta | `/v1/beta/workspaces` | May change before stabilizing |
| Experimental | `/v1/experimental/workspaces` | No stability guarantee |
| Deprecated | Existing route | Scheduled removal |

Rules:

- Stable functionality must never silently change.
- Experimental functionality must be explicitly opted into (via the `/experimental/` or `/beta/` path segment).
- Document experimental breaking changes in the changelog even though they don't require a major bump.
- Promote successful experiments into the stable contract once ready — don't leave them in beta indefinitely.
- Never make experimental functionality a hidden dependency of a stable endpoint.

## Deprecation lifecycle

```text
announce → deprecated (dual-run) → sunset-warning → removed
```

| Stage | Duration (minimum) | Signal to clients |
|-------|---------------------|---------------------|
| **Announce** | — | Changelog entry; migration doc published |
| **Deprecated** | 6 months (field/behavior) / 12 months (major version) | `Deprecation` + `Sunset` + `Link` response headers on every affected call — see [headers.md](./headers.md) |
| **Sunset-warning** | Final 30 days | Same headers, migration urgency called out in the `Link`-referenced doc |
| **Removed** | — | Old major version paths return `404`; deprecated endpoints return `410` after their sunset date |

Minimums, not targets — enterprise contracts may negotiate longer dual-run windows.

Rules:

- Start returning deprecation headers as soon as an endpoint is deprecated — don't wait for the sunset date to approach.
- `Deprecation`/`Sunset`/`Link` headers are a signal, never a substitute for migration documentation.
- Continue supporting the endpoint until its announced sunset date, no earlier.

References: [RFC 9745 — Deprecation](https://www.rfc-editor.org/rfc/rfc9745), [RFC 8594 — Sunset](https://www.rfc-editor.org/rfc/rfc8594).

## Marking a route deprecated (implementation)

`apps/api/src/common/decorators/deprecated.decorator.ts` exposes `@Deprecated({ since, sunset, migrationUrl })`, read by `DeprecationHeadersInterceptor` (registered globally in `create-app.ts`) to set the three headers automatically. Controllers never set these headers by hand.

## Change review gate

Any PR changing a controller/DTO in a way that changes response shape, required fields, or default behavior must declare whether it's additive (safe) or breaking (needs a major version + deprecation window on the old path). The generated `openapi.yaml` diff in the PR is the concrete evidence of what changed — review it alongside the code.
