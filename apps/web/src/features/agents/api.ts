import type {
  Agent,
  AgentRun,
  AgentRunStep,
  CreateAgentRequest,
  CreateAgentRunRequest,
  UpdateAgentRequest,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export type AgentRunWithSteps = AgentRun & { steps: AgentRunStep[] };

export async function listAgents(
  workspaceId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<Agent>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<Agent[]>(
    `/v1/workspaces/${workspaceId}/agents${qs ? `?${qs}` : ""}`
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

export function getAgent(workspaceId: string, agentId: string): Promise<Agent> {
  return apiFetch<Agent>(`/v1/workspaces/${workspaceId}/agents/${agentId}`);
}

export function createAgent(
  workspaceId: string,
  body: CreateAgentRequest
): Promise<Agent> {
  return apiFetch<Agent>(`/v1/workspaces/${workspaceId}/agents`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAgent(
  workspaceId: string,
  agentId: string,
  body: UpdateAgentRequest
): Promise<Agent> {
  return apiFetch<Agent>(`/v1/workspaces/${workspaceId}/agents/${agentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function removeAgent(
  workspaceId: string,
  agentId: string
): Promise<null> {
  return apiFetch<null>(`/v1/workspaces/${workspaceId}/agents/${agentId}`, {
    method: "DELETE",
  });
}

export function runAgent(
  workspaceId: string,
  agentId: string,
  body: CreateAgentRunRequest
): Promise<AgentRun> {
  return apiFetch<AgentRun>(
    `/v1/workspaces/${workspaceId}/agents/${agentId}/runs`,
    { method: "POST", body: JSON.stringify(body) }
  );
}

export async function listAgentRuns(
  workspaceId: string,
  agentId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<AgentRun>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<AgentRun[]>(
    `/v1/workspaces/${workspaceId}/agents/${agentId}/runs${qs ? `?${qs}` : ""}`
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

export function getAgentRun(
  workspaceId: string,
  agentId: string,
  runId: string
): Promise<AgentRunWithSteps> {
  return apiFetch<AgentRunWithSteps>(
    `/v1/workspaces/${workspaceId}/agents/${agentId}/runs/${runId}`
  );
}
