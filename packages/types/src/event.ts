/**
 * Async event envelope — internal-docs/api/events-webhooks.md. Durable events are
 * written to the outbox in the same transaction as the change they describe, then
 * delivered over SSE and webhooks (at-least-once: dedupe on `id`).
 */
export interface WireEvent<T = Record<string, unknown>> {
  id: `evt_${string}`;
  /** Workspace-wide replay cursor (SSE `id:` / `Last-Event-ID`). */
  seq: number;
  type: WireEventType;
  workspaceId: string;
  channelId: string | null;
  data: T;
  createdAt: string;
}

export const WIRE_EVENT_TYPES = [
  "message.created",
  "message.edited",
  "message.deleted",
  "thread.reply",
  "reaction.added",
  "reaction.removed",
  "pin.added",
  "pin.removed",
  "channel.created",
  "channel.updated",
  "channel.archived",
  "channel.unarchived",
  "channel.member.joined",
  "channel.member.left",
  "member.joined",
  "member.updated",
  "member.removed",
  "agent.created",
  "agent.updated",
  "file.created",
] as const;

export type WireEventType = (typeof WIRE_EVENT_TYPES)[number];

/** Ephemeral signals — SSE only, never persisted or replayed. */
export interface PresenceEntry {
  memberId: string;
  status: "active";
  lastSeenAt: string;
}
