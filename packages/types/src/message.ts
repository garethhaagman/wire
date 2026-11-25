/** Mirrors internal-docs/data-model/data-model.md `messages` table */
export interface Message {
  actorId: string;
  actorType: "human" | "agent" | "system";
  body: string;
  /** A thread reply that was also sent to the channel ("Also send to channel"). */
  broadcast: boolean;
  channelId: string;
  createdAt: string;
  /** Tombstone: body is blanked; only returned when the message still has replies. */
  deletedAt: string | null;
  editedAt: string | null;
  id: `msg_${string}`;
  lastReplyAt: string | null;
  /** emoji → count, maintained atomically alongside the reactions table. */
  reactionCounts: Record<string, number>;
  replyCount: number;
  revision: number;
  /** Per-channel monotonically increasing sequence — ordering and gap detection. */
  seq: number;
  threadRootId: string | null;
  updatedAt: string;
  workspaceId: string;
}

export interface CreateMessageRequest {
  body: string;
  channelId: string;
  threadRootId?: string;
}

/** PATCH /v1/channels/{channelId}/messages/{id} */
export interface UpdateMessageRequest {
  body: string;
  /** Optimistic concurrency: reject with 409 if the message has moved past this revision. */
  revision?: number;
}

/** POST /v1/threads/{threadRootId}/messages — product/05-feature-parity.md § Threads */
export interface CreateThreadReplyRequest {
  body: string;
  broadcastToChannel?: boolean;
}
