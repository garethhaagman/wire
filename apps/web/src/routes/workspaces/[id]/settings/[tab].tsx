import { Navigate, useParams } from "react-router-dom";
import type { SettingsTab } from "@/features/workspace-shell/components/settings-shell.js";
import {
  SETTINGS_TABS,
  SettingsShell,
} from "@/features/workspace-shell/components/settings-shell.js";

function isSettingsTab(value: string): value is SettingsTab {
  return (SETTINGS_TABS as readonly string[]).includes(value);
}

export default function SettingsTabRoute(): React.JSX.Element {
  const { id, tab } = useParams<{ id: string; tab: string }>();
  if (!(id && tab)) {
    throw new Error("Missing workspace id or settings tab in route params");
  }
  if (!isSettingsTab(tab)) {
    return <Navigate replace to={`/workspaces/${id}/settings/members`} />;
  }

  return <SettingsShell tab={tab} workspaceId={id} />;
}
