import { useParams } from "react-router-dom";
import { ChannelView } from "@/features/channels/components/channel-view.js";

export default function ThreadRoute(): React.JSX.Element {
  const { id, channelId, threadId } = useParams<{
    channelId: string;
    id: string;
    threadId: string;
  }>();
  if (!(id && channelId && threadId)) {
    throw new Error("Missing workspace, channel, or thread id in route params");
  }

  return (
    <ChannelView
      channelId={channelId}
      threadRootId={threadId}
      workspaceId={id}
    />
  );
}
