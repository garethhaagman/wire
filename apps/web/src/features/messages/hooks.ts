import type { QueryClient } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CreateMessageRequest,
  CreateThreadReplyRequest,
  Message,
  UpdateMessageRequest,
} from "@wire/types";
import { queryKeys } from "@/lib/query-keys.js";
import {
  createMessage,
  deleteMessage,
  getMessage,
  listMessages,
  listThreadMessages,
  markThreadRead,
  replyToThread,
  updateMessage,
} from "./api.js";

export function useMessage(channelId: string | null, messageId: string | null) {
  return useQuery({
    queryKey: queryKeys.messages.detail(channelId ?? "", messageId ?? ""),
    queryFn: () => getMessage(channelId as string, messageId as string),
    enabled: Boolean(channelId && messageId),
  });
}

/** Newest-first infinite list — `fetchNextPage` walks further into the past via `next_cursor`. */
export function useMessages(channelId: string | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages.all(channelId ?? ""),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listMessages(channelId as string, pageParam ? { cursor: pageParam } : {}),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.cursor.has_more
        ? (lastPage.cursor.next_cursor ?? undefined)
        : undefined,
    enabled: Boolean(channelId),
  });
}

export function useThreadMessages(threadRootId: string | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.threads.all(threadRootId ?? ""),
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      listThreadMessages(
        threadRootId as string,
        pageParam === undefined ? {} : { after_seq: pageParam }
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      const last = lastPage.items.at(-1);
      return lastPage.cursor.has_more && last ? last.seq : undefined;
    },
    enabled: Boolean(threadRootId),
  });
}

interface MessagesInfiniteData {
  pageParams: unknown[];
  pages: { cursor: unknown; items: Message[] }[];
}

/** `useMessages` pages are newest-first, so a just-sent message belongs at the front of the first (newest) page. */
function prependToFirstPage(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  message: Message
): void {
  queryClient.setQueryData(
    queryKey,
    (current: MessagesInfiniteData | undefined) => {
      if (!current) {
        return current;
      }
      const [firstPage, ...rest] = current.pages;
      if (!firstPage) {
        return current;
      }
      return {
        ...current,
        pages: [
          { ...firstPage, items: [message, ...firstPage.items] },
          ...rest,
        ],
      };
    }
  );
}

/** `useThreadMessages` pages are oldest-first, so a just-sent reply belongs at the end of the last (newest) page. */
function appendToLastPage(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  message: Message
): void {
  queryClient.setQueryData(
    queryKey,
    (current: MessagesInfiniteData | undefined) => {
      if (!current) {
        return current;
      }
      const lastPage = current.pages.at(-1);
      if (!lastPage) {
        return current;
      }
      return {
        ...current,
        pages: [
          ...current.pages.slice(0, -1),
          { ...lastPage, items: [...lastPage.items, message] },
        ],
      };
    }
  );
}

export function useCreateMessage(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idempotencyKey,
      ...body
    }: Omit<CreateMessageRequest, "channelId"> & { idempotencyKey?: string }) =>
      createMessage(channelId, body, idempotencyKey),
    onSuccess: (message) => {
      prependToFirstPage(
        queryClient,
        queryKeys.messages.all(message.channelId),
        message
      );
      if (message.threadRootId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.threads.all(message.threadRootId),
        });
      }
    },
  });
}

export function useUpdateMessage(channelId: string, messageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateMessageRequest) =>
      updateMessage(channelId, messageId, body),
    onSuccess: (message) => {
      queryClient.setQueryData(
        queryKeys.messages.detail(channelId, messageId),
        message
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.all(channelId),
      });
    },
  });
}

export function useDeleteMessage(channelId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => deleteMessage(channelId, messageId),
    onSuccess: (_data, messageId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.messages.detail(channelId, messageId),
        exact: true,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.all(channelId),
      });
    },
  });
}

export function useReplyToThread(threadRootId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idempotencyKey,
      ...body
    }: CreateThreadReplyRequest & { idempotencyKey?: string }) =>
      replyToThread(threadRootId, body, idempotencyKey),
    onSuccess: (message) => {
      appendToLastPage(
        queryClient,
        queryKeys.threads.all(threadRootId),
        message
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messages.all(message.channelId),
      });
    },
  });
}

export function useMarkThreadRead(threadRootId: string) {
  return useMutation({
    mutationFn: (seq?: number) => markThreadRead(threadRootId, seq),
  });
}
