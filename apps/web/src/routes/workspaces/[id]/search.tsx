import { useParams } from "react-router-dom";
import { SearchPanel } from "@/features/search/components/search-panel.js";

export default function SearchRoute(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    throw new Error("Missing workspace id in route params");
  }

  return <SearchPanel workspaceId={id} />;
}
