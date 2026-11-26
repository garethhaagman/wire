import type {
  AddChannelMemberRequest,
  Channel,
  ChannelMember,
  CreateChannelRequest,
  MarkReadRequest,
  UpdateChannelRequest,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export interface ListChannelsParams extends OffsetPageParams {
  filter?: {
    archived?: "true" | "false";
    joined?: "true" | "false";
    type?: Channel["type"];
  };
}

export async function listChannels(
  workspaceId: string,
  params: ListChannelsParams = {}
): Promise<OffsetPage<Channel>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<Channel[]>(
    `/v1/workspaces/${workspaceId}/channels${qs ? `?${qs}` : ""}`
  );
  return {
    items: body.data ?? [],
    pagination: body.meta.pagination ?? {
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 1,
    },
  };
}

export function getChannel(
  workspaceId: string,
  channelId: string
): Promise<Channel> {
  return apiFetch<Channel>(
    `/v1/workspaces/${workspaceId}/channels/${channelId}`
  );
}

export function createChannel(
  workspaceId: string,
  body: CreateChannelRequest
): Promise<Channel> {
  return apiFetch<Channel>(`/v1/workspaces/${workspaceId}/channels`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateChannel(
  workspaceId: string,
  channelId: string,
  body: UpdateChannelRequest
): Promise<Channel> {
  return apiFetch<Channel>(
    `/v1/workspaces/${workspaceId}/channels/${channelId}`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export function setChannelArchived(
  workspaceId: string,
  channelId: string,
  archived: boolean
): Promise<Channel> {
  const action = archived ? "archive" : "unarchive";
  return apiFetch<Channel>(
    `/v1/workspaces/${workspaceId}/channels/${channelId}/${action}`,
    { method: "POST" }
  );
}

export async function listChannelMembers(
  channelId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<ChannelMember>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<ChannelMember[]>(
    `/v1/channels/${channelId}/members${qs ? `?${qs}` : ""}`
  );
  return {
    items: body.data ?? [],
    pagination: body.meta.pagination ?? {
      page: 1,
      per_page: 20,
      total: 0,
      total_pages: 1,
    },
  };
}

export function addChannelMember(
  channelId: string,
  body: AddChannelMemberRequest
): Promise<ChannelMember> {
  return apiFetch<ChannelMember>(`/v1/channels/${channelId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function removeChannelMember(
  channelId: string,
  memberId: string
): Promise<null> {
  return apiFetch<null>(`/v1/channels/${channelId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export function markChannelRead(
  channelId: string,
  body: MarkReadRequest = {}
): Promise<ChannelMember> {
  return apiFetch<ChannelMember>(`/v1/channels/${channelId}/mark-read`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
