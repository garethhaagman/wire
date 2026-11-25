import { useParams } from "react-router-dom";
import { AppShell } from "@/components/shell/app-shell.js";
import { UiConfigProvider } from "@/lib/ui-config/config-provider.js";

/**
 * Proof point for the config-driven shell: the entire nav/sidebar/topbar/
 * composer arrangement below comes from the workspace's resolved UiConfig,
 * not from this component. See internal-docs/ui/ for the full design.
 */
export default function WorkspaceRoute(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    throw new Error("Missing workspace id in route params");
  }

  return (
    <UiConfigProvider workspaceId={id}>
      <AppShell>
        <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
          Message history goes here — out of scope for this pass.
        </div>
      </AppShell>
    </UiConfigProvider>
  );
}
