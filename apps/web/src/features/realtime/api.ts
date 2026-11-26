import type { PresenceEntry } from "@wire/types";
import { apiFetch } from "@/lib/api-client.js";

export function listPresence(workspaceId: string): Promise<PresenceEntry[]> {
  return apiFetch<PresenceEntry[]>(`/v1/workspaces/${workspaceId}/presence`);
}

export function sendPresenceHeartbeat(workspaceId: string): Promise<null> {
  return apiFetch<null>(`/v1/workspaces/${workspaceId}/presence`, {
    method: "POST",
  });
}

export function sendTyping(
  channelId: string,
  threadRootId?: string
): Promise<null> {
  return apiFetch<null>(`/v1/channels/${channelId}/typing`, {
    method: "POST",
    body: JSON.stringify(threadRootId ? { threadRootId } : {}),
  });
}
