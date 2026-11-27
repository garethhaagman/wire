# Auth security hardening

**Date:** 26 November 2026
**Author:** garethhaagman
**Type:** feature

## Description of change

Production now requires email verification before password sign-in. Rate limiting fails closed when Redis is down. App crypto uses a separate `APP_SECRET`, and auth cookie domains are validated so sessions stay first-party across web and API hosts.

## Implementation details

- `packages/config/src/api-env.ts`, added `APP_SECRET`, `AUTH_COOKIE_DOMAIN`, production refinements (`RESEND_API_KEY`, cookie origin compatibility), and helpers (`requireEmailVerification`, `resolveAppSecret`, `resolveAuthCookieDomain`).
- `apps/api/src/auth/auth.config.ts`, enabled Better Auth email verification in production (Resend via existing sender) and cross-subdomain cookies when web/API share a parent domain.
- `apps/api/src/common/middleware/rate-limit.middleware.ts`, returns `503 SERVICE_UNAVAILABLE` when Redis cannot serve the limiter instead of skipping limits.
- `apps/api/src/webhooks/webhook-secret-box.ts` and `apps/api/src/files/storage/local-disk-adapter.ts`, derive crypto from `APP_SECRET` rather than `BETTER_AUTH_SECRET`.
- `apps/web` login/signup routes, surface verification-required UX (`check email` after signup; clearer 403 on login).
- `infra` / `docker-compose` / `.env.example`, wire `APP_SECRET` through local and Pulumi stacks.

## Trade-offs

- **Chosen:** Fail closed on rate-limit Redis outage, so a Redis failure cannot become an auth flood. Rejected fail-open because the user asked to close that hole; cost is brief 503s during Redis downtime.
- **Chosen:** Separate `APP_SECRET` with a development fallback to `BETTER_AUTH_SECRET`. Rejected always-required `APP_SECRET` in every env to keep local DX; production still requires a distinct secret.
- **Chosen:** Require shared-parent or reverse-proxy cookie topology in production rather than `SameSite=None` third-party cookies. Rejected third-party cookies because Safari ITP blocks them and CSRF posture is weaker.
- **Chosen:** Email verification only when `NODE_ENV=production`. Rejected always-on verification so local/dev signup stays frictionless without Resend.

## User input

User asked to enable email verification in prod and to fix the three previously identified gaps:

> "we should enable email verification in prod.
> fix rate limiter fails open
> fix 4
> and fix 5"
