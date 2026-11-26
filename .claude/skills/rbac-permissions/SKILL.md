---
name: rbac-permissions
description: Use when adding a new endpoint's permission, changing an existing endpoint's permission, adding a new role or permission, or changing what admin/member can do. Step-by-step procedures for Wire's CASL-based RBAC in apps/api. For general endpoint conventions (envelope, errors, pagination), use api-design instead.
version: "1.1.0"
---

# RBAC: roles and permissions

Full reference: `internal-docs/api/permissions.md`. This skill is the scenario playbook, pick the scenario below and follow it exactly.

## The model in one paragraph

Two roles, `admin` and `member`, each a CASL `Ability` built in `apps/api/src/permissions/ability.factory.ts`. `admin` = `can("manage", "all")` (everything, always). `member` = an explicit list of `can(action, subject)` rules, **nothing is implicit**; no rule for a subject means `member` has zero access to it. Every route declares its requirement with `@RequirePermission(action, subject)`, checked by a global guard. There is no third state: a route either has this decorator, has `@Public()` (no auth at all), or fails lint.

---

## Scenario 1, Adding permissions to a brand-new endpoint

You're writing a new controller method (new resource or new action on an existing one).

1. **Does the subject already exist?** Check `PermissionSubject` in `apps/api/src/permissions/permission.types.ts`. If your resource (e.g. `"Invoice"`) isn't listed, go to **Scenario 3** first, then come back here.
2. **Pick the action**: `create` (POST), `read` (GET), `update` (PUT/PATCH), `delete` (DELETE). Use `manage` only inside the admin branch of the ability factory, never put `manage` on a single endpoint.
3. **Add the decorator**, directly above the HTTP method decorator:

   ```typescript
   @Post()
   @RequirePermission("create", "Message")
   @ApiCreatedResponse({ type: MessageDto })
   create(@CurrentActor() actor: WorkspaceActor, @Body() body: CreateMessageRequestDto): Promise<Message> { ... }
   ```
4. **Check `member` already has this `(action, subject)` pair** in `ability.factory.ts`. If yes, you're done. If no, stop and go to **Scenario 3**; don't skip the decision of whether `member` should get this or not.
5. **Run `bun run lint`** in `apps/api`. The `wire-api/require-permission` rule fails the build if the decorator is missing, this is not optional, it's the actual enforcement mechanism, not just a convention.

If this route truly needs no auth at all (not "member-level", **no session**): use `@Public()` instead of `@RequirePermission`, and justify why in a comment. Today only `health.controller.ts` does this.

---

## Scenario 2, Changing permissions on an existing endpoint

You want to tighten or loosen who can call a route that already has `@RequirePermission`.

1. **Find the current decorator** on the handler, e.g. `@RequirePermission("read", "AuditEvent")`.
2. **Decide what's changing**:
   - _Tightening_ (member loses access): remove the corresponding `can(action, subject)` line from the `member` branch in `ability.factory.ts`. The decorator on the controller usually doesn't change, the ability does.
   - _Loosening_ (member gains access): add the `can(action, subject)` line to the `member` branch.
   - _Changing which subject/action the route itself represents_ (rare, usually means the route's semantics changed, not just who can call it): update the decorator's arguments directly.
3. **Never "fix" a permission denial by switching the subject to `"all"` or the action to `"manage"`** on a single route, that's a privilege-escalation shortcut, not a fix. If a route genuinely needs broader access, that's a product decision (see Scenario 3), not a quiet code change.
4. **Re-verify with a live request**, not just lint/typecheck, permission bugs are behavioral, not structural, and the type system can't catch "member can now do something it shouldn't". Boot the API, sign up two sessions, and hit the route as each role. (See the Verification section below for the exact commands.)
5. **Update `internal-docs/api/permissions.md`'s matrix table** to match, it's documentation, but it's the thing a future reader trusts; a stale matrix is worse than no matrix.

---

## Scenario 3, Adding a new role or a new permission to the model

This is the scenario that actually changes the _shape_ of the permission system, not just one endpoint's requirement.

### Adding a new subject (new resource type)

1. Add the name to `PermissionSubject` in `permission.types.ts` (e.g. `| "Invoice"`).
2. In `ability.factory.ts`, decide `member`'s rules for it **explicitly**, even "member gets nothing" should be a one-line comment saying so (see how `WebhookEndpoint` is handled), not silence. Silence looks like an oversight to the next reader; a comment makes it a decision.
3. Use the subject in `@RequirePermission(action, "Invoice")` on the relevant controller(s) (Scenario 1).

### Adding a new role (e.g. a third tier beyond admin/member)

This is a bigger change, today `Role` is a 2-value union (`apps/api/src/permissions/permission.types.ts`), derived from `Member.role` in `PermissionsGuard.canActivate()` (`permissions.guard.ts`): `owner`/`admin` → `admin`, everything else → `member`. To add a role:

1. Extend `Role` in `permission.types.ts`.
2. Add a branch in `defineAbilityFor()` (`ability.factory.ts`) for the new role, don't make it a modified copy of `member`'s rules inline; give it its own explicit list even if it overlaps, so each branch stays independently readable.
3. Update the `Member.role` → `Role` mapping in `PermissionsGuard`. `Member.role` is `"owner" | "admin" | "member" | "guest"` (`@wire/types`); `owner` collapses into `admin` and `guest` into `member` at the CASL level. Guests are restricted in the services instead, `ChannelAccessService` limits them to channels they belong to, and owner-only rules (e.g. "last owner") live in `MembersService`. Decide whether a new CASL role replaces one of those service-level rules before adding it.
4. If the new role changes what a cached membership means, remember `MemberResolverService` caches `{ id, role, displayName }` in Redis for 60s, invalidation on role change is already wired through `MembersService`, but a new source of role data would need its own `invalidate()` call.
5. This is a multi-file, product-level change, don't do it to work around a single endpoint's awkward permission requirement. If you're here because of Scenario 1 or 2 and considering a new role, stop and confirm that's really the right fix first.

### Adding a new action

The five actions (`manage | create | read | update | delete`) cover standard CRUD. Only add a new one (e.g. `"approve"` for an agent-run approval flow) if no combination of the existing five expresses it, and if you do, add it to `PermissionAction` in `permission.types.ts`, not as a magic string on one route.

---

## Verification, don't skip this

Permission logic is the one category of bug that typechecking, linting, and `knip` will never catch, they verify _shape_, not _who can do what_. After any change in Scenarios 1–3:

```sh
# 1. boot with a real Postgres (migrations applied)
cd apps/api && DATABASE_URL=... bun src/main.ts

# 2. sign up, create a workspace, get the session cookie
curl -c cookies.txt -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password1234","name":"Test"}'

# 3. exercise the changed endpoint as a plain member, confirm the expected
#    200/201 or 403 PERMISSION_DENIED
curl -b cookies.txt -X POST http://localhost:3001/v1/workspaces/{id}/whatever ...
```

A `403` response looks like: `{"success":false,"error":{"code":"PERMISSION_DENIED","message":"Role 'member' cannot create Foo."}}`, if you see `INTERNAL_ERROR` instead, the route is missing its `@RequirePermission` entirely (the guard fails closed, see `permissions.guard.ts`), that's a different bug than a permission being wrong, fix it per Scenario 1.

## Workspace scope, required on routes without `:workspaceId`

Role comes from the caller's membership in the route's workspace. Routes with a `:workspaceId` param get this for free; anything nested under a channel/message/thread/file must declare `@WorkspaceScope({ from: "channel" | "message" | "file", param })` (class or handler level), or `bodyChannel` / `optionalQueryWorkspace`, see `internal-docs/api/permissions.md` § Workspace scope. Non-members get `404`, not `403`. If a handler uses `@CurrentActor()` on an unscoped route you'll get `INTERNAL_ERROR`, add the decorator.

Per-row rules ("own message", "channel member", "last owner") are service-level, not CASL, a `403` from a service is a different thing to fix than a missing ability rule.
