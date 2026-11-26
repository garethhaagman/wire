import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell.js";
import { RealtimeProvider } from "@/features/realtime/realtime-provider.js";
import { UiConfigProvider } from "@/lib/ui-config/config-provider.js";
import { WorkspaceShellProvider } from "./workspace-shell-context.js";

/**
 * Composes every provider a workspace-scoped route needs (resolved UiConfig,
 * the realtime SSE connection, and shell navigation state) around AppShell.
 * App mounts this outside the route switch so the shell and SSE connection
 * persist while navigating between channels, threads, search, and settings.
 */
export function WorkspaceLayout({
  workspaceId,
  children,
}: {
  children: ReactNode;
  workspaceId: string;
}): React.JSX.Element {
  return (
    <UiConfigProvider workspaceId={workspaceId}>
      <RealtimeProvider workspaceId={workspaceId}>
        <WorkspaceShellProvider workspaceId={workspaceId}>
          <AppShell>{children}</AppShell>
        </WorkspaceShellProvider>
      </RealtimeProvider>
    </UiConfigProvider>
  );
}
