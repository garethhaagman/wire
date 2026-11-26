import { routes } from "virtual:wire-routes";
import { Route, Routes, useMatch } from "react-router-dom";
import { WorkspaceLayout } from "@/features/workspace-shell/workspace-layout.js";

export default function App(): React.JSX.Element {
  const workspaceMatch = useMatch("/workspaces/:id/*");
  const workspaceId = workspaceMatch?.params.id;
  const routeContent = (
    <Routes>
      {routes.map(({ path, Component }) => (
        <Route element={<Component />} key={path} path={path} />
      ))}
    </Routes>
  );

  if (!workspaceId) {
    return routeContent;
  }

  return (
    <WorkspaceLayout workspaceId={workspaceId}>{routeContent}</WorkspaceLayout>
  );
}
