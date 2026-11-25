# Messaging system design and scaling

How `apps/api` stores and fans out messages, and what changes as load grows. Target: hundreds of thousands of concurrently connected users across many workspaces; the shape follows what Slack, Discord and similar systems converged on — a relational source of truth partitioned by tenant, per-channel ordering, and a separate fan-out tier.

## Components

```
clients ──HTTP──▶ API replicas (stateless) ──tx──▶ Postgres primary ──▶ read replica(s)
   ▲                    │  │                          │
   │                    │  └─ Redis: sessions, rate limits, idempotency, presence, membership cache
   │                    │                              │ events outbox (same tx)
   └──SSE── realtime ◀──┴── Redis pub/sub ◀── outbox relay ──▶ webhook_deliveries ──▶ delivery worker ──▶ customer endpoints
```

- **Postgres** is the only source of truth. Every table carries `workspace_id`, the future shard key: no query joins across workspaces except "workspaces I belong to" and cross-workspace search, which both start from `members.user_id`.
- **Redis** holds only reconstructible state. Losing it logs everyone out of the session cache (sessions are also in Postgres), resets rate-limit windows, and drops in-flight presence — nothing durable.
- **API replicas** are stateless and horizontally scalable. `RUN_WORKERS=true` replicas also run the outbox relay, webhook delivery and retention jobs; these coordinate through `FOR UPDATE SKIP LOCKED`, so any number can run them at once.

## Write path: posting a message

One transaction (`insertMessage` in `packages/db/src/repositories/messages.ts`):

1. `update channels set last_seq = last_seq + 1 … returning last_seq` — allocates the per-channel `seq` and takes the channel row lock. Writers to one channel serialize; different channels never contend. This is the same trade-off as Slack's per-channel ordering: total order within a channel, none across channels.
2. For a reply: bump the root's `reply_count` / `last_reply_seq` and upsert `thread_participants`.
3. Insert the message; advance the author's own read cursor.
4. Append `message.created` (or `thread.reply`) to the `events` outbox.

Commit, then `relay.kick()` publishes within milliseconds. Because the event is written in the same transaction, an event exists if and only if the change committed — no dual-write inconsistency between the database and the realtime bus.

A hot channel (thousands of posts/sec) is bounded by row-lock throughput on its `channels` row, typically several thousand tx/s. Past that, move `seq` allocation to a Redis `INCR` per channel, accepting gaps on rollback.

## Read path

- **History**: keyset pagination over `(channel_id, seq)` with a partial index covering top-level and broadcast messages. Page N costs the same as page 1. Served from the primary by default; history is read-your-writes sensitive.
- **Unread counts**: `channels.last_seq - channel_members.last_read_seq`, capped at 100 for the badge — O(1) per channel, never a `count(*)` over messages. Read cursors only move forward (`greatest(...)`), so out-of-order mark-read calls from multiple devices are harmless.
- **Reactions**: `messages.reaction_counts` (jsonb) is updated in the same statement sequence as the `reactions` row insert/delete, guarded by `UNIQUE(message_id, actor_id, emoji)` with `ON CONFLICT DO NOTHING`, so concurrent double-taps count once and history pages never join reactions.
- **Search**: generated `tsvector` column with a GIN index, ACL applied inside the query, served from the read replica. Totals are capped at 1000.

## Concurrency guarantees

| Operation                                  | Mechanism                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| Message ordering                           | Per-channel `seq` under the channel row lock                                  |
| Edit vs. edit                              | `SELECT … FOR UPDATE` plus optional `revision` precondition → 409 on conflict |
| Duplicate reaction/pin/bookmark            | Unique constraints with `ON CONFLICT DO NOTHING`                              |
| DM creation race                           | `UNIQUE(workspace_id, dm_key)` with `ON CONFLICT` returning the existing DM   |
| Duplicate invite                           | `UNIQUE(workspace_id, lower(email))`                                          |
| Last owner demotion/removal                | `FOR UPDATE` over active owners                                               |
| Retried POST                               | Redis idempotency key with an in-flight marker                                |
| Transient deadlock / serialization failure | `Database.tx` retries 40001/40P01 up to 3×                                    |

## Realtime fan-out

- The relay publishes each event to `wire:ws:{workspaceId}`. Each API replica holds **one** Redis subscriber connection and subscribes only to workspaces that have local SSE connections. A message costs one publish plus one delivery per replica that has listeners, not one per user.
- Per-connection filtering happens in memory. Public channels need no lookup; private channels, DMs and guest connections check a channel member set cached for 30s and invalidated by `channel.member.*` events.
- Resume: the SSE `id:` is the workspace event `seq`. A reconnect with `Last-Event-ID` replays from Postgres with the ACL applied in SQL, buffering live events until replay completes. A client more than 5000 events behind gets `resync`.
- Slow consumers (more than 1MB unflushed) are disconnected rather than buffered without bound.
- Capacity: one Node/Bun process comfortably holds roughly 10–50k idle SSE connections. Hundreds of thousands of concurrent users therefore means about 10–30 replicas behind a load balancer with long idle timeouts. If one Redis becomes the bottleneck, shard pub/sub by workspace (Redis Cluster sharded pub/sub, `SSUBSCRIBE`) or move fan-out to NATS/Kafka. The outbox relay is the only producer, so that swap is local.

## Caching

| Cache                                         | Where                                                          | TTL / invalidation                                          |
| --------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| Session                                       | Redis (Better Auth `secondaryStorage`) + 5-minute cookie cache | Better Auth managed                                         |
| Membership (workspace, user) → member/role    | Redis                                                          | 60s (negative: 5s); explicit invalidation on member changes |
| Resource → workspace (channel/message/file)   | In-process LRU (200k)                                          | None needed: immutable                                      |
| Channel type / channel member sets (realtime) | In-process                                                     | LRU / 30s plus event invalidation                           |

## Retention and background work

- `events`: 7-day replay window, pruned in bounded batches.
- `webhook_deliveries`: finished rows pruned after 7 days; pending rows retry for up to 72h.
- `audit_events`: buffered and inserted in batches (500ms / 200 rows), flushed on shutdown.

## Scaling path

1. **Now**: single primary plus optional read replica (`DATABASE_READ_URL`), PgBouncer in transaction mode in front once replica count × `DATABASE_POOL_MAX` approaches `max_connections`.
2. **Partition big tables**: `events` and `audit_events` by time (monthly, native partitioning) for cheap retention; `messages` by hash of `channel_id` or `workspace_id`. Postgres requires unique constraints to include the partition key, so primary keys become composite (`(channel_id, id)` etc.) as part of that migration.
3. **Shard by workspace**: everything is keyed by `workspace_id`; route each workspace to a shard (Citus, or app-level routing via a workspace → shard directory). Cross-workspace reads (workspace list, global search) fan out by the user's memberships.
4. **Search**: move to a dedicated index (OpenSearch/Typesense, or pgvector for hybrid) fed from the same outbox; see [retrieval/retrieval.md](../retrieval/retrieval.md).

## Not built yet

- File blob storage (signed upload URLs to object storage), virus scanning, text extraction.
- API keys / OAuth apps for non-session clients.
- WebSocket transport (SSE covers server→client; client→server stays on HTTP).
- Agent execution (runs, harnesses); agents exist as records only.
