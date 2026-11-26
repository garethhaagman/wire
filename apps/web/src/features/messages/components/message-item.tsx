import type { Message } from "@wire/types";
import { cn } from "@wire/ui";
import { useState } from "react";
import { useAddBookmark } from "@/features/bookmarks/hooks.js";
import { useAddPin } from "@/features/pins/hooks.js";
import { useToggleReaction } from "@/features/reactions/hooks.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import { EmojiPicker } from "./emoji-picker.js";

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatTime(iso: string): string {
  return TIME_FORMAT.format(new Date(iso));
}

export function MessageItem({
  displayName,
  message,
  onOpenThread,
  workspaceId,
}: {
  displayName: string;
  message: Message;
  onOpenThread?: (threadRootId: string) => void;
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const { add: addReaction, remove: removeReaction } = useToggleReaction(
    message.channelId,
    message.id
  );
  const addPin = useAddPin(message.channelId);
  const addBookmark = useAddBookmark(workspaceId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isDeleted = Boolean(message.deletedAt);
  const threadRootId = message.threadRootId ?? message.id;

  return (
    <div className="group hover:bg-accent/40 -mx-2 flex gap-3 rounded-md px-2 py-1.5">
      <div className="bg-muted text-muted-foreground mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
        {displayName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-foreground text-sm font-semibold">
            {displayName}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatTime(message.createdAt)}
          </span>
          {message.editedAt ? (
            <span className="text-muted-foreground text-xs">(edited)</span>
          ) : null}
        </div>
        <p
          className={cn(
            "text-foreground text-sm whitespace-pre-wrap",
            isDeleted && "text-muted-foreground italic"
          )}
        >
          {isDeleted ? "This message was deleted." : message.body}
        </p>

        {Object.keys(message.reactionCounts).length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(message.reactionCounts).map(([emoji, count]) => (
              <button
                className="border-border bg-card hover:bg-accent flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs"
                key={emoji}
                onClick={() => removeReaction.mutate(emoji)}
                type="button"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {!message.threadRootId && message.replyCount > 0 ? (
          <button
            className="text-primary mt-1 flex items-center gap-1 text-xs font-medium hover:underline"
            onClick={() => onOpenThread?.(threadRootId)}
            type="button"
          >
            {message.replyCount}{" "}
            {message.replyCount === 1 ? "reply" : "replies"}
          </button>
        ) : null}
      </div>

      {isDeleted ? null : (
        <div className="relative flex shrink-0 items-start gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            aria-label="Add reaction"
            className="hover:bg-accent text-muted-foreground flex h-7 w-7 items-center justify-center rounded-md"
            onClick={() => setPickerOpen((open) => !open)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" name="smile" />
          </button>
          {pickerOpen ? (
            <EmojiPicker
              onPick={(emoji) => {
                addReaction.mutate(emoji);
                setPickerOpen(false);
              }}
              onRequestClose={() => setPickerOpen(false)}
            />
          ) : null}
          {message.threadRootId ? null : (
            <button
              aria-label="Reply in thread"
              className="hover:bg-accent text-muted-foreground flex h-7 w-7 items-center justify-center rounded-md"
              onClick={() => onOpenThread?.(threadRootId)}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" name="reply" />
            </button>
          )}
          <button
            aria-label="Pin message"
            className="hover:bg-accent text-muted-foreground flex h-7 w-7 items-center justify-center rounded-md"
            onClick={() => addPin.mutate(message.id)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" name="pin" />
          </button>
          <button
            aria-label="Bookmark message"
            className="hover:bg-accent text-muted-foreground flex h-7 w-7 items-center justify-center rounded-md"
            onClick={() => addBookmark.mutate(message.id)}
            type="button"
          >
            <Icon className="h-3.5 w-3.5" name="bookmark" />
          </button>
        </div>
      )}
    </div>
  );
}
