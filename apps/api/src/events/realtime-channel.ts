import type { WireEvent } from "@wire/types";

/** One pub/sub channel per workspace — a replica subscribes only to workspaces it has open streams for. */
export function workspaceChannel(workspaceId: string): string {
  return `wire:ws:${workspaceId}`;
}

export type RealtimeEnvelope =
  | { kind: "event"; event: WireEvent }
  | {
      kind: "ephemeral";
      type: "typing" | "presence.online";
      workspaceId: string;
      channelId: string | null;
      data: Record<string, unknown>;
    };
