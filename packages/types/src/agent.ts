/** Mirrors internal-docs/data-model/data-model.md `agents` table */
export interface Agent {
  id: `agt_${string}`;
  workspaceId: string;
  handle: string;
  harnessId: string;
  permissionSetId: string | null;
  status: "active" | "paused" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentRequest {
  handle: string;
  harnessId: string;
}

export interface UpdateAgentRequest {
  harnessId?: string;
  status?: "active" | "paused";
}

/** Mirrors internal-docs/data-model/data-model.md `agent_runs` table */
export interface AgentRun {
  id: `run_${string}`;
  workspaceId: string;
  agentId: `agt_${string}`;
  triggeredByMessageId: `msg_${string}` | null;
  channelId: string | null;
  status: "queued" | "running" | "succeeded" | "failed";
  input: { prompt: string; context?: Record<string, unknown> };
  output: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Mirrors internal-docs/data-model/data-model.md `agent_run_steps` table */
export interface AgentRunStep {
  id: `step_${string}`;
  runId: `run_${string}`;
  seq: number;
  type: "model_call" | "tool_call" | "tool_result" | "final";
  data: unknown;
  createdAt: string;
}

export interface CreateAgentRunRequest {
  prompt: string;
  channelId?: string;
}
