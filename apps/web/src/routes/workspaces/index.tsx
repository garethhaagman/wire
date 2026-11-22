import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { Workspace } from "@wire/types";
import { apiFetch } from "@/lib/api-client.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.js";

export default function WorkspacesRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<Workspace[]>("/v1/workspaces"),
  });

  return (
    <main className="flex min-h-dvh items-start justify-center bg-muted px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>Pick a workspace to open.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading workspaces...</p>
          ) : isError ? (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          ) : data?.length ? (
            <ul className="flex flex-col gap-1">
              {data.map((ws) => (
                <li key={ws.id}>
                  <Link
                    to={`/workspaces/${ws.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {ws.name}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No workspaces yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
