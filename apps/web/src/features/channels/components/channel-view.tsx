import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageList } from "@/features/messages/components/message-list.js";
import { ThreadPanel } from "@/features/messages/components/thread-panel.js";
import { useMarkChannelRead } from "../hooks.js";

export function ChannelView({
  workspaceId,
  channelId,
  threadRootId,
}: {
  channelId: string;
  threadRootId?: string;
  workspaceId: string;
}): React.JSX.Element {
  const navigate = useNavigate();
  const { mutate: markChannelRead } = useMarkChannelRead(
    workspaceId,
    channelId
  );

  useEffect(() => {
    markChannelRead({});
  }, [markChannelRead]);

  return (
    <div className="flex min-h-0 flex-1">
      <MessageList
        channelId={channelId}
        onOpenThread={(rootId) =>
          navigate(
            `/workspaces/${workspaceId}/channels/${channelId}/threads/${rootId}`
          )
        }
        workspaceId={workspaceId}
      />
      {threadRootId ? (
        <ThreadPanel
          channelId={channelId}
          onClose={() =>
            navigate(`/workspaces/${workspaceId}/channels/${channelId}`)
          }
          threadRootId={threadRootId}
          workspaceId={workspaceId}
        />
      ) : null}
    </div>
  );
}
