import { cn } from "@wire/ui";
import { Link } from "react-router-dom";
import { AgentsPanel } from "@/features/agents/components/agents-panel.js";
import { AuditLogPanel } from "@/features/audit/components/audit-log-panel.js";
import { MembersPanel } from "@/features/members/components/members-panel.js";
import { WebhooksPanel } from "@/features/webhooks/components/webhooks-panel.js";

export const SETTINGS_TABS = [
  "members",
  "agents",
  "webhooks",
  "audit",
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

const TAB_LABELS: Record<SettingsTab, string> = {
  members: "Members",
  agents: "Agents",
  webhooks: "Webhooks",
  audit: "Audit log",
};

export function SettingsShell({
  workspaceId,
  tab,
}: {
  tab: SettingsTab;
  workspaceId: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
      <h1 className="text-foreground mb-6 text-lg font-semibold">
        Workspace settings
      </h1>
      <nav className="border-border mb-6 flex gap-1 border-b">
        {SETTINGS_TABS.map((t) => (
          <Link
            className={cn(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors",
              t === tab
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={t}
            to={`/workspaces/${workspaceId}/settings/${t}`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </nav>
      {tab === "members" ? <MembersPanel workspaceId={workspaceId} /> : null}
      {tab === "agents" ? <AgentsPanel workspaceId={workspaceId} /> : null}
      {tab === "webhooks" ? <WebhooksPanel workspaceId={workspaceId} /> : null}
      {tab === "audit" ? <AuditLogPanel workspaceId={workspaceId} /> : null}
    </div>
  );
}
