# Retrieval and search

## Design goals

Agents and integrations need **faithful, citeable context**—not raw channel dumps. Wire indexes at **message**, **thread**, and **file chunk** granularity with ACL filtering on every query.

## Index pipeline

1. **Ingest** — On message create/edit, file upload, thread reply.
2. **Normalize** — Strip secrets per DLP rules; expand mentions to handles.
3. **Chunk** — Thread-aware: parent + replies up to token budget; overlap 10%.
4. **Embed** — Workspace-configurable embedding model id; store vector + sparse terms.
5. **Publish** — Chunk visible in search after `indexing_status: ready`.

## Search modes

| Mode       | API                        | Use case                       |
| ---------- | -------------------------- | ------------------------------ |
| Keyword    | `GET /v1/search?q=`        | Exact terms, handles, ids      |
| Semantic   | `POST /v1/search/semantic` | Natural language               |
| Hybrid     | `POST /v1/search/hybrid`   | Default for agents (RRF merge) |
| Structured | `POST /v1/search/records`  | Metadata filters, date ranges  |

All modes accept `channel_ids`, `author_ids`, `actor_types`, `after`/`before`, `thread_id`, `include_files`.

## Context packs

**Context pack** — Materialized, immutable snapshot for a harness prompt:

```json
{
  "context_pack_id": "ctx_abc",
  "sources": [
    { "type": "message", "id": "msg_1", "excerpt": "...", "score": 0.92 },
    { "type": "file_chunk", "id": "fch_2", "excerpt": "..." }
  ],
  "token_count": 4200,
  "citation_format": "wire://workspace/ws_x/channel/ch_y/message/msg_z"
}
```

Created via `POST /v1/context-packs` from search results or explicit ids. Agent runs may reference `context_pack_id` instead of inline history.

## Citations

Messages returned from search include `citation_uri` stable for deep links. Agents must echo citations in `blocks` of type `citation` when answering from retrieval (enforced by optional workspace policy).

## Reindexing and drift

Embedding model changes trigger background reindex jobs (`GET /v1/workspaces/{id}/index-jobs`). Search during reindex returns partial results with `index_coverage` field.

## Privacy

- DM and private channel chunks never leak to agents lacking channel membership.
- **Redaction profiles** strip patterns (credit cards, API keys) before embed and export.
- Legal hold freezes delete and tombstones chunks without physical delete until hold releases.

## MCP tools

`search_hybrid`, `get_context_pack`, `explain_chunk` (why this rank) mirror HTTP API.
