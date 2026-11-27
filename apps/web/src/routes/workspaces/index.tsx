import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@wire/ui";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/auth/brand-mark.js";
import { useWorkspaces } from "@/features/workspaces/hooks.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";

function WorkspaceInitial({ name }: { name: string }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function WorkspaceList({
  workspaces,
}: {
  workspaces: { id: string; name: string }[];
}): React.JSX.Element {
  const Icon = useIcon();

  return (
    <ul className="border-border divide-border divide-y overflow-hidden rounded-md border">
      {workspaces.map((ws) => (
        <li key={ws.id}>
          <Link
            className="hover:bg-accent focus-visible:bg-accent focus-visible:ring-ring flex items-center gap-3 px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
            to={`/workspaces/${ws.id}`}
          >
            <WorkspaceInitial name={ws.name} />
            <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
              {ws.name}
            </span>
            <Icon
              className="text-muted-foreground h-4 w-4 shrink-0"
              name="chevron-right"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WorkspacesRoute(): React.JSX.Element {
  const { data, isLoading, isError, error } = useWorkspaces({ per_page: 100 });
  const workspaces = data?.items;

  let content: React.JSX.Element;
  if (isLoading) {
    content = (
      <div
        aria-busy="true"
        aria-live="polite"
        className="border-border overflow-hidden rounded-md border"
      >
        {[0, 1, 2].map((i) => (
          <div
            className="border-border flex items-center gap-3 border-b px-4 py-3.5 last:border-b-0"
            key={i}
          >
            <div className="bg-muted h-9 w-9 shrink-0 rounded-md" />
            <div className="bg-muted h-3.5 w-32 rounded-sm" />
          </div>
        ))}
      </div>
    );
  } else if (isError) {
    content = (
      <p
        className="border-destructive/20 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-sm"
        role="alert"
      >
        {error.message}
      </p>
    );
  } else if (workspaces?.length) {
    content = <WorkspaceList workspaces={workspaces} />;
  } else {
    content = (
      <div className="px-1 py-6 text-center">
        <p className="text-foreground text-sm font-medium">No workspaces yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Ask an admin to invite you, or create one when that ships.
        </p>
      </div>
    );
  }

  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-8">
        <BrandMark />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>Pick a workspace to open.</CardDescription>
          </CardHeader>
          <CardContent>{content}</CardContent>
        </Card>
      </div>
    </main>
  );
}
