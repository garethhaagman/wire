import { useMemberLookup } from "@/features/members/use-member-lookup.js";
import { useTypingMembers } from "@/features/realtime/hooks.js";
import { useMessages } from "../hooks.js";
import { MessageItem } from "./message-item.js";

/**
 * `listMessages` returns newest-first pages; reversing each page (but not the
 * page order) renders the whole list oldest-first without refetching.
 */
export function MessageList({
  channelId,
  workspaceId,
  onOpenThread,
}: {
  channelId: string;
  onOpenThread: (threadRootId: string) => void;
  workspaceId: string;
}): React.JSX.Element {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(channelId);
  const typingMemberIds = useTypingMembers(channelId);
  const { displayNameFor } = useMemberLookup(workspaceId);

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Loading messages…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="text-destructive flex flex-1 items-center justify-center text-sm"
        role="alert"
      >
        {error.message}
      </div>
    );
  }

  const messages = [...(data?.pages ?? [])]
    .reverse()
    .flatMap((page) => [...page.items].reverse());

  if (messages.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        No messages yet — say hello.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-4 py-3">
      {hasNextPage ? (
        <button
          className="text-primary self-center text-xs font-medium hover:underline disabled:opacity-50"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          type="button"
        >
          {isFetchingNextPage ? "Loading…" : "Load earlier messages"}
        </button>
      ) : null}
      {messages.map((message) => (
        <MessageItem
          displayName={displayNameFor(message.actorId)}
          key={message.id}
          message={message}
          onOpenThread={onOpenThread}
          workspaceId={workspaceId}
        />
      ))}
      {typingMemberIds.length > 0 ? (
        <p className="text-muted-foreground px-1 text-xs italic">
          {typingMemberIds.map(displayNameFor).join(", ")}{" "}
          {typingMemberIds.length === 1 ? "is" : "are"} typing…
        </p>
      ) : null}
    </div>
  );
}
