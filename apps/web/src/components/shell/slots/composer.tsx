import { useRef, useState } from "react";
import { useUploadFile } from "@/features/files/hooks.js";
import { useCreateMessage } from "@/features/messages/hooks.js";
import { sendTyping } from "@/features/realtime/api.js";
import { useWorkspaceShell } from "@/features/workspace-shell/workspace-shell-context.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import type { SlotProps } from "../slot-registry.js";

const TYPING_THROTTLE_MS = 3000;

function useComposerState(channelId: string | null): {
  attaching: boolean;
  body: string;
  errorMessage: string | null;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleBodyChange: (value: string) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  sending: boolean;
} {
  const [body, setBody] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAt = useRef(0);
  const createMessage = useCreateMessage(channelId ?? "");
  const uploadFile = useUploadFile(channelId ?? "");

  function handleBodyChange(value: string): void {
    setBody(value);
    const now = Date.now();
    if (channelId && now - lastTypingSentAt.current >= TYPING_THROTTLE_MS) {
      lastTypingSentAt.current = now;
      void sendTyping(channelId);
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const trimmed = body.trim();
    if (!(trimmed && channelId)) {
      return;
    }
    createMessage.mutate(
      { body: trimmed, idempotencyKey: crypto.randomUUID() },
      { onSuccess: () => setBody("") }
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!(file && channelId)) {
      return;
    }
    uploadFile.mutate(file, {
      onSuccess: (uploaded) => {
        createMessage.mutate({
          body: `📎 ${uploaded.name}`,
          idempotencyKey: crypto.randomUUID(),
        });
      },
    });
  }

  return {
    body,
    errorMessage:
      createMessage.error?.message ?? uploadFile.error?.message ?? null,
    handleBodyChange,
    handleSubmit,
    handleFileChange,
    fileInputRef,
    sending: createMessage.isPending,
    attaching: uploadFile.isPending,
  };
}

function ComposerDefaultForm({
  channelId,
}: {
  channelId: string | null;
}): React.JSX.Element {
  const Icon = useIcon();
  const {
    attaching,
    body,
    errorMessage,
    fileInputRef,
    handleBodyChange,
    handleFileChange,
    handleSubmit,
    sending,
  } = useComposerState(channelId);

  return (
    <div className="border-border bg-background border-t px-4 py-3">
      {errorMessage ? (
        <p className="text-destructive mb-2 text-xs" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <input
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <button
          aria-label="Attach file"
          className="text-muted-foreground hover:bg-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-md disabled:opacity-50"
          disabled={!channelId || attaching}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Icon className="h-4 w-4" name="paperclip" />
        </button>
        <input
          aria-label="Message"
          className="border-border bg-card text-foreground focus:ring-ring flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
          disabled={!channelId}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder={channelId ? "Message…" : "Select a channel"}
          type="text"
          value={body}
        />
        <button
          aria-label="Send message"
          className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-md transition-opacity hover:opacity-90 disabled:opacity-50"
          disabled={!(body.trim() && channelId) || sending}
          type="submit"
        >
          <Icon className="h-4 w-4" name="send" />
        </button>
      </form>
    </div>
  );
}

export function ComposerDefault(_props: SlotProps): React.JSX.Element {
  const { activeChannelId } = useWorkspaceShell();
  return (
    <ComposerDefaultForm
      channelId={activeChannelId}
      key={activeChannelId ?? "no-channel"}
    />
  );
}

function ComposerCompactForm({
  channelId,
}: {
  channelId: string | null;
}): React.JSX.Element {
  const Icon = useIcon();
  const { body, errorMessage, handleBodyChange, handleSubmit, sending } =
    useComposerState(channelId);

  return (
    <div className="border-border bg-background border-t px-2 py-1.5">
      {errorMessage ? (
        <p className="text-destructive mb-1 text-xs" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <form className="flex items-center gap-1.5" onSubmit={handleSubmit}>
        <input
          aria-label="Message"
          className="border-border bg-card text-foreground focus:ring-ring flex-1 rounded border px-2 py-1 text-xs outline-none focus:ring-1"
          disabled={!channelId}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder="Message..."
          type="text"
          value={body}
        />
        <button
          aria-label="Send message"
          className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded disabled:opacity-50"
          disabled={!(body.trim() && channelId) || sending}
          type="submit"
        >
          <Icon className="h-3 w-3" name="send" />
        </button>
      </form>
    </div>
  );
}

/** A denser variant — same slot id, different variant, selectable purely via config. */
export function ComposerCompact(_props: SlotProps): React.JSX.Element {
  const { activeChannelId } = useWorkspaceShell();
  return (
    <ComposerCompactForm
      channelId={activeChannelId}
      key={activeChannelId ?? "no-channel"}
    />
  );
}
