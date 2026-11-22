import { useQuery } from "@tanstack/react-query";
import type { Workspace } from "@wire/types";
import { apiFetch } from "@/lib/api-client.js";

export default function WorkspacesRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<Workspace[]>("/v1/workspaces"),
  });

  if (isLoading) return <p>Loading workspaces...</p>;
  if (isError) return <p role="alert">{error.message}</p>;

  return (
    <main>
      <h1>Workspaces</h1>
      {data?.length ? (
        <ul>
          {data.map((ws) => (
            <li key={ws.id}>{ws.name}</li>
          ))}
        </ul>
      ) : (
        <p>No workspaces yet.</p>
      )}
    </main>
  );
}
