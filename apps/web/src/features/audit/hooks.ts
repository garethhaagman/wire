import { useQuery } from "@tanstack/react-query";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import { listAuditEvents } from "./api.js";

export function useAuditEvents(
  workspaceId: string,
  params: OffsetPageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.audit.list(workspaceId, params),
    queryFn: () => listAuditEvents(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}
