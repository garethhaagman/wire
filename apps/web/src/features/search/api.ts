import type { SearchResult } from "@wire/types";
import { apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export interface SearchParams {
  channelId?: string;
  page?: number;
  perPage?: number;
  query: string;
  threadRootId?: string;
  workspaceId?: string;
}

export async function search(
  params: SearchParams
): Promise<OffsetPage<SearchResult>> {
  const qs = buildQueryString({
    q: params.query,
    workspace_id: params.workspaceId,
    channel_id: params.channelId,
    thread_root_id: params.threadRootId,
    page: params.page,
    per_page: params.perPage,
  });
  const body = await apiFetchEnvelope<SearchResult[]>(`/v1/search?${qs}`);
  return {
    items: body.data ?? [],
    pagination: body.meta.pagination ?? {
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 1,
    },
  };
}
