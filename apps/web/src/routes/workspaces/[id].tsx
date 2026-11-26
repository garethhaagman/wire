/**
 * Proof point for the config-driven shell: the entire nav/sidebar/topbar/
 * composer arrangement comes from the workspace's resolved UiConfig via
 * WorkspaceLayout, not from this component. See internal-docs/ui/ for the
 * full design. No channel is selected yet here — picking one navigates to
 * routes/workspaces/[id]/channels/[channelId].tsx.
 */
export default function WorkspaceRoute(): React.JSX.Element {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
      Select a channel to get started.
    </div>
  );
}
