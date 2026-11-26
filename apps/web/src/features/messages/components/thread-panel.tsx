import { Button } from "@wire/ui";
import { useState } from "react";
import { useMemberLookup } from "@/features/members/use-member-lookup.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import { useMessage, useReplyToThread, useThreadMessages } from "../hooks.js";
import { MessageItem } from "./message-item.js";

export function ThreadPanel({
  channelId,
  threadRootId,
  workspaceId,
  onClose,
}: {
  channelId: string;
  onClose: () => void;
  threadRootId: string;
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const { data: root, isLoading: isRootLoading } = useMessage(
    channelId,
    threadRootId
  );
  const { data, isLoading, fetchNextPage, hasNextPage } =
    useThreadMessages(threadRootId);
  const reply = useReplyToThread(threadRootId);
  const { displayNameFor } = useMemberLookup(workspaceId);
  const [body, setBody] = useState("");

  /** listThreadMessages returns replies only (never the root) and oldest-first. */
  const replies = (data?.pages ?? []).flatMap((page) => page.items);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }
    reply.mutate(
      { body: trimmed, idempotencyKey: crypto.randomUUID() },
      { onSuccess: () => setBody("") }
    );
  }

  return (
    <div className="border-border bg-background flex h-full w-96 shrink-0 flex-col border-l">
      <div className="border-border flex h-12 items-center justify-between border-b px-4">
        <span className="text-foreground text-sm font-semibold">Thread</span>
        <button
          aria-label="Close thread"
          className="hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md"
          onClick={onClose}
          type="button"
        >
          <Icon className="h-4 w-4" name="x" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isRootLoading || isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : null}
        {root ? (
          <MessageItem
            displayName={displayNameFor(root.actorId)}
            message={root}
            workspaceId={workspaceId}
          />
        ) : null}
        {replies.length > 0 ? (
          <div className="border-border mt-2 flex flex-col gap-0.5 border-t pt-2">
            {replies.map((message) => (
              <MessageItem
                displayName={displayNameFor(message.actorId)}
                key={message.id}
                message={message}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        ) : null}
        {!isLoading && replies.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">No replies yet.</p>
        ) : null}
        {hasNextPage ? (
          <button
            className="text-primary mt-2 text-xs font-medium hover:underline"
            onClick={() => void fetchNextPage()}
            type="button"
          >
            Load more replies
          </button>
        ) : null}
      </div>

      <form
        className="border-border flex items-center gap-2 border-t px-3 py-2.5"
        onSubmit={handleSubmit}
      >
        <input
          className="border-border bg-card text-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply…"
          type="text"
          value={body}
        />
        <Button
          disabled={!body.trim() || reply.isPending}
          size="sm"
          type="submit"
        >
          Reply
        </Button>
      </form>
    </div>
  );
}
