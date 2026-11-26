import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys.js";
import type { SearchParams } from "./api.js";
import { search } from "./api.js";

export function useSearch(params: SearchParams & { enabled?: boolean }) {
  const { enabled = true, ...searchParams } = params;
  return useQuery({
    queryKey: queryKeys.search.results(searchParams),
    queryFn: () => search(searchParams),
    enabled: enabled && params.query.trim().length > 0,
  });
}
