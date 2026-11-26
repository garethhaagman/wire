import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateAgentRequest,
  CreateAgentRunRequest,
  UpdateAgentRequest,
} from "@wire/types";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import {
  createAgent,
  getAgent,
  getAgentRun,
  listAgentRuns,
  listAgents,
  removeAgent,
  runAgent,
  updateAgent,
} from "./api.js";

export function useAgents(workspaceId: string, params: OffsetPageParams = {}) {
  return useQuery({
    queryKey: queryKeys.agents.list(workspaceId, params),
    queryFn: () => listAgents(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}

export function useAgent(workspaceId: string, agentId: string | null) {
  return useQuery({
    queryKey: queryKeys.agents.detail(workspaceId, agentId ?? ""),
    queryFn: () => getAgent(workspaceId, agentId as string),
    enabled: Boolean(workspaceId && agentId),
  });
}

export function useCreateAgent(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAgentRequest) => createAgent(workspaceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(workspaceId),
      });
    },
  });
}

export function useUpdateAgent(workspaceId: string, agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateAgentRequest) =>
      updateAgent(workspaceId, agentId, body),
    onSuccess: (agent) => {
      queryClient.setQueryData(
        queryKeys.agents.detail(workspaceId, agentId),
        agent
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(workspaceId),
      });
    },
  });
}

export function useRemoveAgent(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => removeAgent(workspaceId, agentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.all(workspaceId),
      });
    },
  });
}

export function useRunAgent(workspaceId: string, agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAgentRunRequest) =>
      runAgent(workspaceId, agentId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agents.runs(workspaceId, agentId),
      });
    },
  });
}

export function useAgentRuns(
  workspaceId: string,
  agentId: string | null,
  params: OffsetPageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.agents.runList(workspaceId, agentId ?? "", params),
    queryFn: () => listAgentRuns(workspaceId, agentId as string, params),
    enabled: Boolean(workspaceId && agentId),
  });
}

export function useAgentRun(
  workspaceId: string,
  agentId: string | null,
  runId: string | null
) {
  return useQuery({
    queryKey: queryKeys.agents.run(workspaceId, agentId ?? "", runId ?? ""),
    queryFn: () => getAgentRun(workspaceId, agentId as string, runId as string),
    enabled: Boolean(workspaceId && agentId && runId),
    refetchInterval: (query) =>
      query.state.data?.status === "queued" ||
      query.state.data?.status === "running"
        ? 2000
        : false,
  });
}
