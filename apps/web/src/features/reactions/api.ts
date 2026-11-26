import type { Reaction } from "@wire/types";
import { apiFetch } from "@/lib/api-client.js";

export function listReactions(messageId: string): Promise<Reaction[]> {
  return apiFetch<Reaction[]>(`/v1/messages/${messageId}/reactions`);
}

export function addReaction(
  messageId: string,
  emoji: string
): Promise<Reaction> {
  return apiFetch<Reaction>(`/v1/messages/${messageId}/reactions`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export function removeReaction(
  messageId: string,
  emoji: string
): Promise<null> {
  return apiFetch<null>(
    `/v1/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
    { method: "DELETE" }
  );
}
