import { Input } from "@wire/ui";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIcon } from "@/lib/ui-config/icon-pack.js";
import { useSearch } from "../hooks.js";

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const SEARCH_DEBOUNCE_MS = 300;
const HIGHLIGHT_PATTERN = /<mark>(?<highlightedText>[\s\S]*?)<\/mark>/giu;

function SearchExcerpt({ excerpt }: { excerpt: string }): React.JSX.Element {
  const content: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of excerpt.matchAll(HIGHLIGHT_PATTERN)) {
    const { index } = match;
    if (index > cursor) {
      content.push(excerpt.slice(cursor, index));
    }
    content.push(
      <mark
        className="bg-primary/20 text-foreground rounded-sm"
        key={`highlight-${index}`}
      >
        {match.groups?.highlightedText}
      </mark>
    );
    cursor = index + match[0].length;
  }

  if (cursor < excerpt.length) {
    content.push(excerpt.slice(cursor));
  }

  return <span className="text-foreground text-sm">{content}</span>;
}

export function SearchPanel({
  workspaceId,
}: {
  workspaceId: string;
}): React.JSX.Element {
  const Icon = useIcon();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedQuery(query),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, isFetching } = useSearch({
    workspaceId,
    query: debouncedQuery,
  });
  const isSearching = query !== debouncedQuery || isFetching;

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col px-6 py-8">
      <div className="relative">
        <Icon
          className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          name="search"
        />
        <Input
          autoFocus
          className="pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages…"
          value={query}
        />
      </div>

      {isSearching ? (
        <p className="text-muted-foreground mt-4 text-sm">Searching…</p>
      ) : null}

      {!isSearching && query.trim() && data?.items.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">No results.</p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-1 overflow-y-auto">
        {(data?.items ?? []).map((result) => (
          <li key={result.messageId}>
            <button
              className="border-border hover:bg-accent flex w-full flex-col gap-1 rounded-md border px-3 py-2.5 text-left"
              onClick={() =>
                navigate(
                  `/workspaces/${workspaceId}/channels/${result.channelId}`
                )
              }
              type="button"
            >
              <span className="text-muted-foreground text-xs">
                {DATE_FORMAT.format(new Date(result.createdAt))}
              </span>
              <SearchExcerpt excerpt={result.excerpt} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
