import type { SearchResult } from "@wire/types";
import { isoRequired, type Queryable } from "../database.js";

/** Totals beyond this are reported as the cap — an exact count of a broad query is a full index scan. */
const SEARCH_COUNT_CAP = 1000;

export interface SearchScope {
  /** Member ids of the caller, one per workspace being searched. */
  memberIds: string[];
  /** Workspaces where the caller may also see public channels they haven't joined (i.e. not a guest). */
  publicWorkspaceIds: string[];
}

export interface SearchFilters {
  query: string;
  channelId?: string | undefined;
  threadRootId?: string | undefined;
  limit: number;
  offset: number;
}

/**
 * Postgres full-text search (GIN on messages.search_vector) with the ACL applied in
 * SQL: a message is visible if the caller is a member of its channel, or it's in a
 * public channel of a workspace where the caller isn't a guest. Results never
 * leave the database unfiltered.
 */
export async function searchMessages(
  db: Queryable,
  scope: SearchScope,
  filters: SearchFilters,
): Promise<{ items: SearchResult[]; total: number }> {
  const where = `
    m.search_vector @@ q.query
    and m.deleted_at is null
    and ($3::text is null or m.channel_id = $3)
    and ($4::text is null or m.thread_root_id = $4 or m.id = $4)
    and (
      exists (select 1 from channel_members cm where cm.channel_id = m.channel_id and cm.member_id = any($1::text[]))
      or exists (
        select 1 from channels c
        where c.id = m.channel_id and c.type = 'public' and c.workspace_id = any($2::text[])
      )
    )`;
  const params = [scope.memberIds, scope.publicWorkspaceIds, filters.channelId ?? null, filters.threadRootId ?? null, filters.query];

  const [rows, count] = await Promise.all([
    db.query<{
      id: string;
      workspace_id: string;
      channel_id: string;
      thread_root_id: string | null;
      actor_id: string;
      created_at: Date;
      score: number;
      excerpt: string;
    }>(
      `with q as (select websearch_to_tsquery('simple', $5) as query),
       hits as (
         select m.id, m.workspace_id, m.channel_id, m.thread_root_id, m.actor_id, m.created_at, m.body,
                ts_rank_cd(m.search_vector, q.query) as score
         from messages m, q
         where ${where}
         order by score desc, m.created_at desc
         limit $6 offset $7
       )
       select hits.id, hits.workspace_id, hits.channel_id, hits.thread_root_id, hits.actor_id, hits.created_at, hits.score,
              ts_headline('simple', hits.body, q.query, 'MaxWords=30, MinWords=10, StartSel=<mark>, StopSel=</mark>') as excerpt
       from hits, q
       order by hits.score desc, hits.created_at desc`,
      [...params, filters.limit, filters.offset],
    ),
    db.query<{ total: number }>(
      `with q as (select websearch_to_tsquery('simple', $5) as query)
       select count(*)::int as total from (select 1 from messages m, q where ${where} limit ${SEARCH_COUNT_CAP}) capped`,
      params,
    ),
  ]);

  return {
    items: rows.rows.map((r) => ({
      messageId: r.id,
      workspaceId: r.workspace_id,
      channelId: r.channel_id,
      threadRootId: r.thread_root_id,
      actorId: r.actor_id,
      excerpt: r.excerpt,
      score: Number(r.score),
      createdAt: isoRequired(r.created_at),
    })),
    total: count.rows[0]?.total ?? 0,
  };
}

/** The caller's active memberships — the input to SearchScope. */
export async function listMembershipsForUser(
  db: Queryable,
  userId: string,
): Promise<{ workspaceId: string; memberId: string; role: string }[]> {
  const { rows } = await db.query<{ workspace_id: string; id: string; role: string }>(
    `select workspace_id, id, role from members where user_id = $1 and deactivated_at is null`,
    [userId],
  );
  return rows.map((r) => ({ workspaceId: r.workspace_id, memberId: r.id, role: r.role }));
}
