import { useParams } from "react-router-dom";
import { ChannelView } from "@/features/channels/components/channel-view.js";

export default function ChannelRoute(): React.JSX.Element {
  const { id, channelId } = useParams<{ channelId: string; id: string }>();
  if (!(id && channelId)) {
    throw new Error("Missing workspace or channel id in route params");
  }

  return <ChannelView channelId={channelId} workspaceId={id} />;
}
