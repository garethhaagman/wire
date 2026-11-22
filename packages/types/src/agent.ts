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
