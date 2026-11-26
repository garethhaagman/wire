import type { Pin } from "@wire/types";
import { apiFetch } from "@/lib/api-client.js";

export function listPins(channelId: string): Promise<Pin[]> {
  return apiFetch<Pin[]>(`/v1/channels/${channelId}/pins`);
}

export function addPin(channelId: string, messageId: string): Promise<Pin> {
  return apiFetch<Pin>(`/v1/channels/${channelId}/pins`, {
    method: "POST",
    body: JSON.stringify({ messageId }),
  });
}

export function removePin(channelId: string, pinId: string): Promise<null> {
  return apiFetch<null>(`/v1/channels/${channelId}/pins/${pinId}`, {
    method: "DELETE",
  });
}
