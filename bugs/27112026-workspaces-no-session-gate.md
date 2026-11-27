# Workspaces reachable without a session

- **Date found:** 27 November 2026
- **Found by:** user (manual)
- **Area:** apps/web routing / auth
- **Severity:** high

## Summary

Signed-out users could open `/workspaces` (and nested workspace URLs). The page called the API and rendered “No active session” instead of sending them to login.

## Expected behavior

Unauthenticated visits to authenticated surfaces redirect to `/login`.

## Actual behavior

`/workspaces` rendered inside `AuthLayout` with a destructive alert: “No active session.”

## Steps to reproduce

1. Open the web app signed out (or with a cleared session cookie).
2. Navigate to `/workspaces` (or land there after a stale bookmark).
3. Observe the API error UI instead of the login form.

## Evidence

Screenshot of Workspaces + “No active session” on the auth layout (user-provided).

## Suspected root cause (at time of discovery)

Only `/` checked `useSession` and redirected. File-based routes were registered publicly; `/workspaces` trusted the API 401 for UX.
