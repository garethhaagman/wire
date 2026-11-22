import { Route, Routes } from "react-router-dom";
import { routes } from "virtual:wire-routes";

export default function App(): React.JSX.Element {
  return (
    <Routes>
      {routes.map(({ path, Component }) => (
        <Route key={path} path={path} element={<Component />} />
      ))}
    </Routes>
  );
}
