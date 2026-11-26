import { Navigate, useParams } from "react-router-dom";

export default function SettingsIndexRoute(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    throw new Error("Missing workspace id in route params");
  }
  return <Navigate replace to={`/workspaces/${id}/settings/members`} />;
}
