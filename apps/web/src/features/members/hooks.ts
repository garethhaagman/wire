import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateMemberRequest,
  UpdateMemberPreferencesRequest,
  UpdateMemberRequest,
} from "@wire/types";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import {
  createMember,
  getMe,
  getMember,
  getMemberPreferences,
  listMembers,
  removeMember,
  updateMember,
  updateMemberPreferences,
} from "./api.js";

export function useMembers(workspaceId: string, params: OffsetPageParams = {}) {
  return useQuery({
    queryKey: queryKeys.members.list(workspaceId, params),
    queryFn: () => listMembers(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}

export function useMember(workspaceId: string, memberId: string | null) {
  return useQuery({
    queryKey: queryKeys.members.detail(workspaceId, memberId ?? ""),
    queryFn: () => getMember(workspaceId, memberId as string),
    enabled: Boolean(workspaceId && memberId),
  });
}

export function useMe(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.members.me(workspaceId),
    queryFn: () => getMe(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useMemberPreferences(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.members.preferences(workspaceId),
    queryFn: () => getMemberPreferences(workspaceId),
    enabled: Boolean(workspaceId),
  });
}

export function useUpdateMemberPreferences(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMemberPreferencesRequest) =>
      updateMemberPreferences(workspaceId, body),
    onSuccess: (preferences) => {
      queryClient.setQueryData(
        queryKeys.members.preferences(workspaceId),
        preferences
      );
    },
  });
}

export function useCreateMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMemberRequest) => createMember(workspaceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(workspaceId),
      });
    },
  });
}

export function useUpdateMember(workspaceId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMemberRequest) =>
      updateMember(workspaceId, memberId, body),
    onSuccess: (member) => {
      queryClient.setQueryData(
        queryKeys.members.detail(workspaceId, memberId),
        member
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(workspaceId),
      });
    },
  });
}

export function useRemoveMember(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(workspaceId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.members.all(workspaceId),
      });
    },
  });
}
