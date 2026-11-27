import { routes } from "virtual:wire-routes";
import { Route, Routes, useMatch } from "react-router-dom";
import { PUBLIC_ROUTE_PATHS } from "@/components/auth/public-routes.js";
import { RequireSession } from "@/components/auth/require-session.js";
import { WorkspaceLayout } from "@/features/workspace-shell/workspace-layout.js";

export default function App(): React.JSX.Element {
  const workspaceMatch = useMatch("/workspaces/:id/*");
  const workspaceId = workspaceMatch?.params.id;

  const routeContent = (
    <Routes>
      {routes.map(({ path, Component }) => {
        const element = PUBLIC_ROUTE_PATHS.has(path) ? (
          <Component />
        ) : (
          <RequireSession>
            <Component />
          </RequireSession>
        );

        return <Route element={element} key={path} path={path} />;
      })}
    </Routes>
  );

  // Nested workspace chrome also fetches; keep the shell behind the same gate
  // so it never mounts for an anonymous visitor.
  if (!workspaceId) {
    return routeContent;
  }

  return (
    <RequireSession>
      <WorkspaceLayout workspaceId={workspaceId}>
        {routeContent}
      </WorkspaceLayout>
    </RequireSession>
  );
}
