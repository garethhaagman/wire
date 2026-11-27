# Workspace picker crashed for seeded dev user

- **Date found:** 27 November 2026
- **Found by:** user (manual)
- **Area:** apps/web workspaces picker / icon pack
- **Severity:** high

## Summary

After signing in as `dev@wire.local`, the `/workspaces` picker failed to render when Wire Dev was in the list.

## Expected behavior

Picker shows Wire Dev and lets you open it.

## Actual behavior

Page did not load (React crash) once the list had items.

## Steps to reproduce

1. `make seed` (Wire Dev exists for `dev@wire.local`).
2. Sign in as `dev@wire.local` / `wire-dev-password`.
3. Land on `/workspaces`.

## Evidence

API returned 200 with one workspace; empty-state path worked earlier (no icons). Crash only when rendering list rows that call `useIcon()`.

## Suspected root cause (at time of discovery)

`useIcon()` requires `IconRegistryProvider`. That provider only lived under `UiConfigProvider` inside `WorkspaceLayout`. `/workspaces` is outside that layout, so listing workspaces threw.
