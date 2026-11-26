import type {
  CreateMemberRequest,
  Member,
  MemberPreferences,
  UpdateMemberPreferencesRequest,
  UpdateMemberRequest,
} from "@wire/types";
import { apiFetch, apiFetchEnvelope } from "@/lib/api-client.js";
import type { OffsetPage, OffsetPageParams } from "@/lib/pagination.js";
import { buildQueryString } from "@/lib/pagination.js";

export async function listMembers(
  workspaceId: string,
  params: OffsetPageParams = {}
): Promise<OffsetPage<Member>> {
  const qs = buildQueryString(params);
  const body = await apiFetchEnvelope<Member[]>(
    `/v1/workspaces/${workspaceId}/members${qs ? `?${qs}` : ""}`
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

export function getMember(
  workspaceId: string,
  memberId: string
): Promise<Member> {
  return apiFetch<Member>(`/v1/workspaces/${workspaceId}/members/${memberId}`);
}

export function getMe(workspaceId: string): Promise<Member> {
  return apiFetch<Member>(`/v1/workspaces/${workspaceId}/members/me`);
}

export function getMemberPreferences(
  workspaceId: string
): Promise<MemberPreferences> {
  return apiFetch<MemberPreferences>(
    `/v1/workspaces/${workspaceId}/members/me/preferences`
  );
}

export function updateMemberPreferences(
  workspaceId: string,
  body: UpdateMemberPreferencesRequest
): Promise<MemberPreferences> {
  return apiFetch<MemberPreferences>(
    `/v1/workspaces/${workspaceId}/members/me/preferences`,
    { method: "PATCH", body: JSON.stringify(body) }
  );
}

export function createMember(
  workspaceId: string,
  body: CreateMemberRequest
): Promise<Member> {
  return apiFetch<Member>(`/v1/workspaces/${workspaceId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateMember(
  workspaceId: string,
  memberId: string,
  body: UpdateMemberRequest
): Promise<Member> {
  return apiFetch<Member>(`/v1/workspaces/${workspaceId}/members/${memberId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function removeMember(
  workspaceId: string,
  memberId: string
): Promise<null> {
  return apiFetch<null>(`/v1/workspaces/${workspaceId}/members/${memberId}`, {
    method: "DELETE",
  });
}
