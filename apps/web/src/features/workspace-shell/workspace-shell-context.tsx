import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { useMatch, useNavigate } from "react-router-dom";

/**
 * Shell slots (nav-primary, channel-list, topbar, composer) only receive
 * `props: Record<string, unknown>` from the layout config — see
 * components/shell/slot-registry.tsx. They still need to know which
 * workspace/channel/thread is active to query and mutate real data, so this
 * context carries that plus the handful of navigation actions slots need,
 * sourced from the router rather than duplicated as local state.
 */
interface WorkspaceShellContextValue {
  activeChannelId: string | null;
  activeThreadId: string | null;
  openChannel: (channelId: string) => void;
  openSearch: () => void;
  openSettings: () => void;
  openThread: (threadRootId: string) => void;
  workspaceId: string;
}

const WorkspaceShellContext = createContext<WorkspaceShellContextValue | null>(
  null
);

export function WorkspaceShellProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}): React.JSX.Element {
  const navigate = useNavigate();
  const channelMatch = useMatch("/workspaces/:id/channels/:channelId");
  const threadMatch = useMatch(
    "/workspaces/:id/channels/:channelId/threads/:threadId"
  );
  const activeChannelId =
    threadMatch?.params.channelId ?? channelMatch?.params.channelId ?? null;
  const activeThreadId = threadMatch?.params.threadId ?? null;

  const value = useMemo<WorkspaceShellContextValue>(
    () => ({
      workspaceId,
      activeChannelId,
      activeThreadId,
      openChannel: (channelId) =>
        navigate(`/workspaces/${workspaceId}/channels/${channelId}`),
      openThread: (threadRootId) => {
        if (!activeChannelId) {
          return;
        }
        navigate(
          `/workspaces/${workspaceId}/channels/${activeChannelId}/threads/${threadRootId}`
        );
      },
      openSearch: () => navigate(`/workspaces/${workspaceId}/search`),
      openSettings: () => navigate(`/workspaces/${workspaceId}/settings`),
    }),
    [workspaceId, activeChannelId, activeThreadId, navigate]
  );

  return (
    <WorkspaceShellContext.Provider value={value}>
      {children}
    </WorkspaceShellContext.Provider>
  );
}

export function useWorkspaceShell(): WorkspaceShellContextValue {
  const ctx = useContext(WorkspaceShellContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceShell must be used within WorkspaceShellProvider"
    );
  }
  return ctx;
}
