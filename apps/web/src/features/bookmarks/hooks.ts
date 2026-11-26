import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OffsetPageParams } from "@/lib/pagination.js";
import { queryKeys } from "@/lib/query-keys.js";
import { addBookmark, listBookmarks, removeBookmark } from "./api.js";

export function useBookmarks(
  workspaceId: string,
  params: OffsetPageParams = {}
) {
  return useQuery({
    queryKey: queryKeys.bookmarks.list(workspaceId, params),
    queryFn: () => listBookmarks(workspaceId, params),
    enabled: Boolean(workspaceId),
  });
}

export function useAddBookmark(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => addBookmark(workspaceId, messageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookmarks.all(workspaceId),
      });
    },
  });
}

export function useRemoveBookmark(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookmarkId: string) => removeBookmark(workspaceId, bookmarkId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookmarks.all(workspaceId),
      });
    },
  });
}
