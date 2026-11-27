# Auth protected by default

**Date:** 27 November 2026
**Author:** garethhaagman
**Type:** architectural-decision

## Description of change

Authenticated routes are now the default in the web app. Only `/`, `/login`, and `/signup` stay public. Every other file-based route is wrapped in `RequireSession` in `App`, so a new page cannot ship unsigned-in by accident.

## Implementation details

- `apps/web/src/components/auth/public-routes.ts`, explicit allowlist of public path patterns
- `apps/web/src/components/auth/require-session.tsx`, shared session gate (pending shell → `/login`)
- `apps/web/src/App.tsx`, wraps non-public routes and `WorkspaceLayout` with `RequireSession`
- `apps/web/src/routes/workspaces/index.tsx`, removed per-page guard (App owns it now)

## Trade-offs

- **Chosen:** protect-by-default in `App` with a small public allowlist, matches “new routes inherit auth” and keeps login/signup as deliberate exceptions.
- **Rejected:** per-route `RequireSession` wrappers, easy to forget on the next page (how `/workspaces` shipped open).
- **Rejected:** moving auth into the Vite route codegen, heavier than needed for three public paths and harder to read at the call site.

## User input

> "fix the auth default too with your suggestions"
