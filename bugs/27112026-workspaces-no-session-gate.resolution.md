# Workspaces reachable without a session, resolution

- **Date resolved:** 27 November 2026
- **Resolved by:** agent
- **Related bug:** bugs/27112026-workspaces-no-session-gate.md

## Root cause

No shared route guard. Auth redirects lived only on `/` (and “already signed in” redirects on login/signup). `/workspaces` and nested workspace routes had none.

## Fix

Introduced `RequireSession` and made protection the default in `App`: every route path not in `PUBLIC_ROUTE_PATHS` (`/`, `/login`, `/signup`) is wrapped. `WorkspaceLayout` is gated the same way so shell fetches never run anonymously.

## Verification

Visit `/workspaces` signed out → redirects to `/login`. Signed-in visit still shows the picker.
