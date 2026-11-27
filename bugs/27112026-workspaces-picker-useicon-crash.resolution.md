# Workspace picker crashed for seeded dev user, resolution

- **Date resolved:** 27 November 2026
- **Resolved by:** agent
- **Related bug:** bugs/27112026-workspaces-picker-useicon-crash.md

## Root cause

`WorkspaceList` called `useIcon()` on a route with no `IconRegistryProvider`. Empty state skipped that hook path, so the bug only appeared once the seeded workspace existed.

## Fix

Mounted a base `IconRegistryProvider` (from `baseUiConfig.theme.iconPack`) in `main.tsx` alongside `applyTheme`. Workspace routes still nest the resolved registry via `UiConfigProvider`.

## Verification

Refresh `/workspaces` as `dev@wire.local`, Wire Dev row renders with chevron; click opens the workspace shell.
