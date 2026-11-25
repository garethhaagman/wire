import { useQuery } from "@tanstack/react-query";
import type { Workspace } from "@wire/types";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.js";
import { apiFetch } from "@/lib/api-client.js";

export default function WorkspacesRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<Workspace[]>("/v1/workspaces"),
  });

  let content: React.JSX.Element;
  if (isLoading) {
    content = (
      <p className="text-muted-foreground text-sm">Loading workspaces...</p>
    );
  } else if (isError) {
    content = (
      <p className="text-destructive text-sm" role="alert">
        {error.message}
      </p>
    );
  } else if (data?.length) {
    content = (
      <ul className="flex flex-col gap-1">
        {data.map((ws) => (
          <li key={ws.id}>
            <Link
              className="border-border text-foreground hover:bg-accent hover:text-accent-foreground flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors"
              to={`/workspaces/${ws.id}`}
            >
              {ws.name}
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    );
  } else {
    content = (
      <p className="text-muted-foreground text-sm">No workspaces yet.</p>
    );
  }

  return (
    <main className="bg-muted flex min-h-dvh items-start justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
          <CardDescription>Pick a workspace to open.</CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    </main>
  );
}
