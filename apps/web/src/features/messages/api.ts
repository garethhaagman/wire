import type {
  CreateMessageRequest,
  CreateThreadReplyRequest,
  Message,
  UpdateMessageRequest,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { CursorPage, CursorPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

async function fetchCursorPage(
  path: string,
  params: CursorPageParams
): Promise<CursorPage<Message>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<Message[]>(
    `${path}${qs ? `?${qs}` : ""}`
  );
  return {
    items: body.data ?? [],
    cursor: body.meta.cursor ?? {
      has_more: false,
      next_cursor: null,
      per_page: 50,
    },
  };
}

export function listMessages(
  channelId: string,
  params: CursorPageParams = {}
): Promise<CursorPage<Message>> {
  return fetchCursorPage(`/v1/channels/${channelId}/messages`, params);
}

export function getMessage(
  channelId: string,
  messageId: string
): Promise<Message> {
  return apiFetch<Message>(`/v1/channels/${channelId}/messages/${messageId}`);
}

export function createMessage(
  channelId: string,
  body: Omit<CreateMessageRequest, "channelId">,
  idempotencyKey?: string
): Promise<Message> {
  return apiFetch<Message>(`/v1/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
    ...(idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : {}),
  });
}

export function updateMessage(
  channelId: string,
  messageId: string,
  body: UpdateMessageRequest
): Promise<Message> {
  return apiFetch<Message>(`/v1/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteMessage(
  channelId: string,
  messageId: string
): Promise<null> {
  return apiFetch<null>(`/v1/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function listThreadMessages(
  threadRootId: string,
  params: CursorPageParams = {}
): Promise<CursorPage<Message>> {
  return fetchCursorPage(`/v1/threads/${threadRootId}/messages`, params);
}

export function replyToThread(
  threadRootId: string,
  body: CreateThreadReplyRequest,
  idempotencyKey?: string
): Promise<Message> {
  return apiFetch<Message>(`/v1/threads/${threadRootId}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
    ...(idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : {}),
  });
}

export function markThreadRead(
  threadRootId: string,
  seq?: number
): Promise<{ lastReadSeq: number }> {
  return apiFetch<{ lastReadSeq: number }>(
    `/v1/threads/${threadRootId}/mark-read`,
    { method: "POST", body: JSON.stringify(seq === undefined ? {} : { seq }) }
  );
}
