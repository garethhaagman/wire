import { Button, Input, Label } from "@wire/ui";
import { useState } from "react";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import {
  useCreateWebhookEndpoint,
  useRemoveWebhookEndpoint,
  useWebhookEndpoints,
} from "../hooks.js";

export function WebhooksPanel({
  workspaceId,
}: {
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const { data, isLoading } = useWebhookEndpoints(workspaceId);
  const createEndpoint = useCreateWebhookEndpoint(workspaceId);
  const removeEndpoint = useRemoveWebhookEndpoint(workspaceId);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState("*");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent): void {
    e.preventDefault();
    if (!url.trim()) {
      return;
    }
    createEndpoint.mutate(
      {
        url: url.trim(),
        enabledEvents: events
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      {
        onSuccess: (created) => {
          setRevealedSecret(created.secret);
          setUrl("");
          setEvents("*");
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {revealedSecret ? (
        <div className="border-primary/30 bg-primary/5 rounded-md border px-4 py-3">
          <p className="text-foreground text-sm font-medium">
            Signing secret (shown once — store it now)
          </p>
          <code className="text-foreground mt-1 block text-sm break-all">
            {revealedSecret}
          </code>
          <Button
            className="mt-2"
            onClick={() => setRevealedSecret(null)}
            size="sm"
            variant="outline"
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <form
        className="border-border bg-card flex flex-wrap items-end gap-3 rounded-md border p-4"
        onSubmit={handleCreate}
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="webhook-url">Endpoint URL</Label>
          <Input
            id="webhook-url"
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/wire"
            type="url"
            value={url}
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <Label htmlFor="webhook-events">Events (comma-separated, or *)</Label>
          <Input
            id="webhook-events"
            onChange={(e) => setEvents(e.target.value)}
            placeholder="message.created, thread.reply"
            value={events}
          />
        </div>
        <Button disabled={createEndpoint.isPending} type="submit">
          <Icon name="plus" />
          Add endpoint
        </Button>
      </form>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {(data?.items ?? []).map((endpoint) => (
          <li
            className="border-border bg-card flex items-center justify-between rounded-md border px-4 py-3"
            key={endpoint.id}
          >
            <div>
              <div className="flex items-center gap-2">
                <Icon
                  className="text-muted-foreground h-4 w-4"
                  name="webhook"
                />
                <span className="text-foreground text-sm font-medium">
                  {endpoint.url}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {endpoint.enabledEvents.join(", ")}
              </p>
            </div>
            <Button
              onClick={() => removeEndpoint.mutate(endpoint.id)}
              size="sm"
              variant="destructive"
            >
              <Icon name="trash" />
            </Button>
          </li>
        ))}
        {data?.items.length === 0 ? (
          <li className="text-muted-foreground text-sm">No endpoints yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
