/** Mirrors internal-docs/data-model/data-model.md `messages` table */
export interface Message {
  id: `msg_${string}`;
  channelId: string;
  threadRootId: string | null;
  actorId: string;
  actorType: "human" | "agent" | "system";
  body: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageRequest {
  channelId: string;
  body: string;
  threadRootId?: string;
}

/** POST /v1/threads/{threadRootId}/messages — product/05-feature-parity.md § Threads */
export interface CreateThreadReplyRequest {
  body: string;
  broadcastToChannel?: boolean;
}
