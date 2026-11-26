import type {
  CreateWebhookEndpointRequest,
  WebhookEndpoint,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export type WebhookEndpointCreated = WebhookEndpoint & { secret: string };

export async function listWebhookEndpoints(
  workspaceId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<WebhookEndpoint>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<WebhookEndpoint[]>(
    `/v1/workspaces/${workspaceId}/webhook-endpoints${qs ? `?${qs}` : ""}`
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

export function getWebhookEndpoint(
  workspaceId: string,
  id: string
): Promise<WebhookEndpoint> {
  return apiFetch<WebhookEndpoint>(
    `/v1/workspaces/${workspaceId}/webhook-endpoints/${id}`
  );
}

export function createWebhookEndpoint(
  workspaceId: string,
  body: CreateWebhookEndpointRequest
): Promise<WebhookEndpointCreated> {
  return apiFetch<WebhookEndpointCreated>(
    `/v1/workspaces/${workspaceId}/webhook-endpoints`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export function removeWebhookEndpoint(
  workspaceId: string,
  id: string
): Promise<null> {
  return apiFetch<null>(
    `/v1/workspaces/${workspaceId}/webhook-endpoints/${id}`,
    { method: "DELETE" }
  );
}
