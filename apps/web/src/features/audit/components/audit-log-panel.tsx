import { useState } from "react";
import { Button } from "@/components/ui/button.js";
import { useAuditEvents } from "../hooks.js";

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

export function AuditLogPanel({
  workspaceId,
}: {
  workspaceId: string;
}): React.JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditEvents(workspaceId, {
    page,
    per_page: 50,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-left text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Resource</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((event) => (
              <tr className="border-border border-t" key={event.id}>
                <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                  {DATE_FORMAT.format(new Date(event.createdAt))}
                </td>
                <td className="text-foreground px-3 py-2">{event.actorId}</td>
                <td className="text-foreground px-3 py-2">{event.action}</td>
                <td className="text-muted-foreground px-3 py-2">
                  {event.resource}
                  {event.resourceId ? ` · ${event.resourceId}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading ? (
          <p className="text-muted-foreground px-3 py-2 text-sm">Loading…</p>
        ) : null}
        {!isLoading && data?.items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-2 text-sm">
            No audit events yet.
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        <Button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          size="sm"
          variant="outline"
        >
          Previous
        </Button>
        <span className="text-muted-foreground text-xs">
          Page {data?.pagination.page ?? page} of{" "}
          {data?.pagination.total_pages ?? 1}
        </span>
        <Button
          disabled={
            Boolean(data) && page >= (data?.pagination.total_pages ?? 1)
          }
          onClick={() => setPage((p) => p + 1)}
          size="sm"
          variant="outline"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
