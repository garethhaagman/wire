import type { AuditEvent } from "@wire/types";
import { apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export async function listAuditEvents(
  workspaceId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<AuditEvent>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<AuditEvent[]>(
    `/v1/workspaces/${workspaceId}/audit-events${qs ? `?${qs}` : ""}`
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
