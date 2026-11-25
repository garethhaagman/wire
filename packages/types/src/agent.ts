/** Mirrors internal-docs/data-model/data-model.md `agents` table */
export interface Agent {
  createdAt: string;
  handle: string;
  harnessId: string;
  id: `agt_${string}`;
  permissionSetId: string | null;
  status: "active" | "paused" | "deleted";
  updatedAt: string;
  workspaceId: string;
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
  agentId: `agt_${string}`;
  channelId: string | null;
  createdAt: string;
  error: string | null;
  finishedAt: string | null;
  id: `run_${string}`;
  input: { prompt: string; context?: Record<string, unknown> };
  output: string | null;
  startedAt: string | null;
  status: "queued" | "running" | "succeeded" | "failed";
  triggeredByMessageId: `msg_${string}` | null;
  updatedAt: string;
  workspaceId: string;
}

/** Mirrors internal-docs/data-model/data-model.md `agent_run_steps` table */
export interface AgentRunStep {
  createdAt: string;
  data: unknown;
  id: `step_${string}`;
  runId: `run_${string}`;
  seq: number;
  type: "model_call" | "tool_call" | "tool_result" | "final";
}

export interface CreateAgentRunRequest {
  channelId?: string;
  prompt: string;
}
