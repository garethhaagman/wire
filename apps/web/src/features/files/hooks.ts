import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import {
  getDownloadUrl,
  getFile,
  listChannelFiles,
  uploadFile,
} from "./api.js";

export function useChannelFiles(
  channelId: string | null,
  params: OffsetPageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.files.list(channelId ?? "", params),
    queryFn: () => listChannelFiles(channelId as string, params),
    enabled: Boolean(channelId),
  });
}

export function useFile(fileId: string | null) {
  return useQuery({
    queryKey: queryKeys.files.detail(fileId ?? ""),
    queryFn: () => getFile(fileId as string),
    enabled: Boolean(fileId),
  });
}

export function useDownloadUrl(fileId: string) {
  return useMutation({ mutationFn: () => getDownloadUrl(fileId) });
}

export function useUploadFile(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadFile(channelId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.files.all(channelId),
      });
    },
  });
}
