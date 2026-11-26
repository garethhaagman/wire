import type {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  Workspace,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export async function listWorkspaces(
  params: OffsetPageParams = {}
): Promise<OffsetPage<Workspace>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<Workspace[]>(
    `/v1/workspaces${qs ? `?${qs}` : ""}`
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

export function getWorkspace(id: string): Promise<Workspace> {
  return apiFetch<Workspace>(`/v1/workspaces/${id}`);
}

export function createWorkspace(
  body: CreateWorkspaceRequest
): Promise<Workspace> {
  return apiFetch<Workspace>("/v1/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateWorkspace(
  id: string,
  body: UpdateWorkspaceRequest
): Promise<Workspace> {
  return apiFetch<Workspace>(`/v1/workspaces/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}
