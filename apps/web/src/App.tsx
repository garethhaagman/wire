import { routes } from "virtual:wire-routes";
import { Route, Routes } from "react-router-dom";

export default function App(): React.JSX.Element {
  return (
    <Routes>
      {routes.map(({ path, Component }) => (
        <Route element={<Component />} key={path} path={path} />
      ))}
    </Routes>
  );
}
