# Member claim flow (post-import)

After Slack import, humans exist as **unclaimed** members with email and display name but no login binding.

## States

| `claim_status` | Meaning |
|----------------|---------|
| `unclaimed` | Imported only; cannot post as human until claimed |
| `pending_invite` | Claim email sent |
| `claimed` | Auth identity linked |
| `merged` | Combined with existing member |

## Claim triggers

1. **Email match** — User signs in with SSO/email equal to `Member.email` → auto-claim if domain policy allows.
2. **Claim token** — Link from `send-claim-invites` with `claim_token` one-time use.
3. **Admin assign** — `POST /members/{id}/claim` binds specified auth user id.

## Conflicts

| Situation | Resolution |
|-----------|------------|
| Email already claimed in workspace | `import.report` warning; admin picks `skip` or `merge` |
| Same person two Slack ids | Admin merge via `POST /members/merge` |
| Bot mistaken for human | Reclassify → agent stub |

## API

- `POST /imports/{id}/send-claim-invites` — optional `member_ids[]`, `only_unclaimed: true`
- `GET /members?claim_status=unclaimed`
- `POST /members/{id}/claim`

Until claimed, messages **authored by that Slack user** remain attributed to the imported `member_id` (history integrity).