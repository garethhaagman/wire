import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import {
  useAgentRuns,
  useAgents,
  useCreateAgent,
  useRemoveAgent,
  useRunAgent,
} from "../hooks.js";

export function AgentsPanel({
  workspaceId,
}: {
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const { data, isLoading } = useAgents(workspaceId);
  const createAgent = useCreateAgent(workspaceId);
  const removeAgent = useRemoveAgent(workspaceId);
  const [handle, setHandle] = useState("");
  const [harnessId, setHarnessId] = useState("");
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent): void {
    e.preventDefault();
    if (!(handle.trim() && harnessId.trim())) {
      return;
    }
    createAgent.mutate(
      { handle: handle.trim(), harnessId: harnessId.trim() },
      {
        onSuccess: () => {
          setHandle("");
          setHarnessId("");
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="border-border bg-card flex flex-wrap items-end gap-3 rounded-md border p-4"
        onSubmit={handleCreate}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-handle">Handle</Label>
          <Input
            id="agent-handle"
            onChange={(e) => setHandle(e.target.value)}
            placeholder="oncall-bot"
            value={handle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="agent-harness">Harness ID</Label>
          <Input
            id="agent-harness"
            onChange={(e) => setHarnessId(e.target.value)}
            placeholder="harness_claude-code"
            value={harnessId}
          />
        </div>
        <Button disabled={createAgent.isPending} type="submit">
          <Icon name="plus" />
          Add agent
        </Button>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {(data?.items ?? []).map((agent) => (
          <li
            className="border-border bg-card rounded-md border"
            key={agent.id}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Icon className="text-muted-foreground h-4 w-4" name="bot" />
                  <span className="text-foreground text-sm font-medium">
                    @{agent.handle}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {agent.status}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {agent.harnessId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() =>
                    setExpandedAgentId((current) =>
                      current === agent.id ? null : agent.id
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  Runs
                </Button>
                <Button
                  onClick={() => removeAgent.mutate(agent.id)}
                  size="sm"
                  variant="destructive"
                >
                  <Icon name="trash" />
                </Button>
              </div>
            </div>
            {expandedAgentId === agent.id ? (
              <AgentRunsSection agentId={agent.id} workspaceId={workspaceId} />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AgentRunsSection({
  workspaceId,
  agentId,
}: {
  agentId: string;
  workspaceId: string;
}): React.JSX.Element {
  const { data } = useAgentRuns(workspaceId, agentId);
  const runAgent = useRunAgent(workspaceId, agentId);
  const [prompt, setPrompt] = useState("");

  function handleTrigger(e: React.FormEvent): void {
    e.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    runAgent.mutate(
      { prompt: prompt.trim() },
      { onSuccess: () => setPrompt("") }
    );
  }

  return (
    <div className="border-border bg-muted/40 border-t px-4 py-3">
      <form className="mb-3 flex gap-2" onSubmit={handleTrigger}>
        <Input
          aria-label="Prompt"
          className="flex-1"
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Run with a prompt…"
          value={prompt}
        />
        <Button disabled={runAgent.isPending} size="sm" type="submit">
          Run
        </Button>
      </form>
      <ul className="flex flex-col gap-1.5">
        {(data?.items ?? []).map((run) => (
          <li
            className="border-border bg-card flex items-center justify-between rounded border px-2.5 py-1.5 text-xs"
            key={run.id}
          >
            <span className="text-foreground truncate">{run.input.prompt}</span>
            <span className="text-muted-foreground shrink-0">{run.status}</span>
          </li>
        ))}
        {data?.items.length === 0 ? (
          <li className="text-muted-foreground text-xs">No runs yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
