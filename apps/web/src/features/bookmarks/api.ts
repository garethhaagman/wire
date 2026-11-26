import type { Bookmark } from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export async function listBookmarks(
  workspaceId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<Bookmark>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<Bookmark[]>(
    `/v1/workspaces/${workspaceId}/bookmarks${qs ? `?${qs}` : ""}`
  );
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

export function addBookmark(
  workspaceId: string,
  messageId: string
): Promise<Bookmark> {
  return apiFetch<Bookmark>(`/v1/workspaces/${workspaceId}/bookmarks`, {
    method: "POST",
    body: JSON.stringify({ messageId }),
  });
}

export function removeBookmark(
  workspaceId: string,
  bookmarkId: string
): Promise<null> {
  return apiFetch<null>(
    `/v1/workspaces/${workspaceId}/bookmarks/${bookmarkId}`,
    { method: "DELETE" }
  );
}
