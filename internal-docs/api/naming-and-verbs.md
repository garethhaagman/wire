# Resource naming and HTTP verbs

## Resource naming

RESTful, resource-based naming:

- Nouns, not verbs.
- Plural resource names.
- Lowercase, kebab-case for multi-word resources.
- Consistent nesting that mirrors the data model's ownership (e.g. messages nest under channels, agents nest under workspaces, see [data-model/data-model.md](../data-model/data-model.md)).
- Avoid deeply nested URLs: two levels of nesting is the practical ceiling (`/v1/channels/{channelId}/messages`, not `/v1/workspaces/{id}/channels/{id}/messages/{id}/reactions`).

| Good                         | Avoid                      |
| ---------------------------- | -------------------------- |
| `GET /v1/workspaces`         | `GET /v1/getWorkspaces`    |
| `GET /v1/workspaces/{id}`    | `GET /v1/getWorkspaceById` |
| `POST /v1/workspaces`        | `POST /v1/createWorkspace` |
| `PATCH /v1/workspaces/{id}`  | `POST /v1/updateWorkspace` |
| `DELETE /v1/workspaces/{id}` | `POST /v1/deleteWorkspace` |

For operations that aren't CRUD, use action subresources:

```http
POST /v1/agent-runs/{id}/approve
POST /v1/agent-runs/{id}/reject
POST /v1/automations/{id}/execute
```

## HTTP verbs

| Verb     | Purpose                     | Example                      |
| -------- | --------------------------- | ---------------------------- |
| `GET`    | Retrieve                    | `GET /v1/workspaces`         |
| `POST`   | Create or execute an action | `POST /v1/workspaces`        |
| `PUT`    | Full replacement            | `PUT /v1/workspaces/{id}`    |
| `PATCH`  | Partial update              | `PATCH /v1/workspaces/{id}`  |
| `DELETE` | Delete                      | `DELETE /v1/workspaces/{id}` |

Rules:

- `GET` must never modify state.
- `PUT` and `DELETE` should be idempotent.
- `POST` is generally non-idempotent: support `Idempotency-Key` for POSTs where duplicate execution matters (see [headers.md](./headers.md)).

## Controller handler naming (enforced by lint)

`@wire/eslint-plugin-wire-api`'s `controller-verb-naming` rule checks that handler method names match the HTTP verb they implement, so the resource/action mapping stays predictable across every controller:

| Decorator   | Expected method name pattern         |
| ----------- | ------------------------------------ |
| `@Get()`    | `list`, `get`, `getById`, `find...`  |
| `@Post()`   | `create`, `add`, `execute`, `run...` |
| `@Put()`    | `replace`, `set...`                  |
| `@Patch()`  | `update`, `patch...`                 |
| `@Delete()` | `remove`, `delete...`                |

See `apps/workspaces/workspaces.controller.ts` for the reference shape every resource controller should follow.
