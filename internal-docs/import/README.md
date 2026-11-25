# Import

Wire’s **primary onboarding** path is importing a **Slack workspace admin export** (zip). See [workspace-import.md](./workspace-import.md).

| Doc                                              | Contents                          |
| ------------------------------------------------ | --------------------------------- |
| [slack-admin-export.md](./slack-admin-export.md) | Zip layout → Wire entity mapping  |
| [claim-flow.md](./claim-flow.md)                 | Unclaimed members and first login |

**Quick API sequence**

1. `POST /import-uploads` → upload zip to `upload_url`
2. `POST /workspaces/from-import` with `upload_id`, workspace name, `ImportOptions`
3. Poll `GET /imports/{id}` until `status: completed`
4. `POST /imports/{id}/send-claim-invites` (optional)
