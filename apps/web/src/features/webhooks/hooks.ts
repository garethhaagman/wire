import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateWebhookEndpointRequest } from "@wire/types";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import {
  createWebhookEndpoint,
  listWebhookEndpoints,
  removeWebhookEndpoint,
} from "./api.js";

export function useWebhookEndpoints(
  workspaceId: string,
  params: OffsetPageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.webhooks.list(workspaceId, params),
    queryFn: () => listWebhookEndpoints(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}

export function useCreateWebhookEndpoint(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateWebhookEndpointRequest) =>
      createWebhookEndpoint(workspaceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.webhooks.all(workspaceId),
      });
    },
  });
}

export function useRemoveWebhookEndpoint(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeWebhookEndpoint(workspaceId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.webhooks.all(workspaceId),
      });
    },
  });
}
