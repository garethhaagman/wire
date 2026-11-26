import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddChannelMemberRequest,
  CreateChannelRequest,
  MarkReadRequest,
  UpdateChannelRequest,
} from "@wire/types";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import type { ListChannelsParams } from "./api.js";
import {
  addChannelMember,
  createChannel,
  getChannel,
  listChannelMembers,
  listChannels,
  markChannelRead,
  removeChannelMember,
  setChannelArchived,
  updateChannel,
} from "./api.js";

export function useChannels(
  workspaceId: string,
  params: ListChannelsParams = {}
) {
  return useQuery({
    queryKey: queryKeys.channels.list(workspaceId, params),
    queryFn: () => listChannels(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}

export function useChannel(workspaceId: string, channelId: string | null) {
  return useQuery({
    queryKey: queryKeys.channels.detail(workspaceId, channelId ?? ""),
    queryFn: () => getChannel(workspaceId, channelId as string),
    enabled: Boolean(workspaceId && channelId),
  });
}

export function useCreateChannel(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChannelRequest) =>
      createChannel(workspaceId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
    },
  });
}

export function useUpdateChannel(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChannelRequest) =>
      updateChannel(workspaceId, channelId, body),
    onSuccess: (channel) => {
      queryClient.setQueryData(
        queryKeys.channels.detail(workspaceId, channelId),
        channel
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
    },
  });
}

export function useSetChannelArchived(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (archived: boolean) =>
      setChannelArchived(workspaceId, channelId, archived),
    onSuccess: (channel) => {
      queryClient.setQueryData(
        queryKeys.channels.detail(workspaceId, channelId),
        channel
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
    },
  });
}

export function useChannelMembers(
  channelId: string | null,
  params: OffsetPageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.channels.memberList(channelId ?? "", params),
    queryFn: () => listChannelMembers(channelId as string, params),
    enabled: Boolean(channelId),
  });
}

export function useAddChannelMember(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddChannelMemberRequest) =>
      addChannelMember(channelId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.members(channelId),
      });
    },
  });
}

export function useRemoveChannelMember(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeChannelMember(channelId, memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.members(channelId),
      });
    },
  });
}

export function useMarkChannelRead(workspaceId: string, channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MarkReadRequest = {}) =>
      markChannelRead(channelId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.channels.all(workspaceId),
      });
    },
  });
}
